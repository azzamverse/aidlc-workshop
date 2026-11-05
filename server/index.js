import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { createContext } from './context.js';
import { logger } from './platform/logger.js';
import { readSettings } from './platform/settings.js';

function start() {
  const settings = readSettings();
  if (!fs.existsSync(path.join(settings.distDir, 'index.html'))) {
    throw new Error(`The screens are not built: ${settings.distDir} has no index.html. Run "npm run build".`);
  }
  const context = createContext({ dbFile: settings.dbFile });
  context.live.start();
  const app = createApp(context, { distDir: settings.distDir, isTestMode: settings.isTestMode });

  const server = app.listen(settings.port, () => {
    logger.info(`Table Order is running at http://localhost:${settings.port}`, { dbFile: settings.dbFile });
  });
  server.on('error', (error) => {
    logger.error(`Could not listen on PORT ${settings.port}`, error);
    process.exit(1);
  });

  const shutDown = () => {
    server.close(() => context.close());
    server.closeAllConnections();
  };
  process.on('SIGINT', shutDown);
  process.on('SIGTERM', shutDown);
}

try {
  start();
} catch (error) {
  logger.error(`Table Order could not start: ${error.message}`, error);
  process.exit(1);
}
