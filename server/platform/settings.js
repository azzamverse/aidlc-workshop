import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const DEFAULT_PORT = 3000;
const DEFAULT_E2E_PORT = 3100;
const DEFAULT_DB_FILE = path.join(PROJECT_ROOT, 'data', 'table-order.db');

function readPort(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid setting ${name}="${raw}": it must be a whole number from 1 to 65535.`);
  }
  return port;
}

/** The PIN screen takes exactly 4 digits, so any other STAFF_PIN could never be entered. */
function readStaffPin(env) {
  const raw = env.STAFF_PIN;
  if (raw === undefined || raw === '') return null;
  if (!/^\d{4}$/.test(raw)) throw new Error('Invalid setting STAFF_PIN: it must be exactly 4 digits.');
  return raw;
}

/**
 * Reads every setting from the environment. A relative DB_FILE resolves against
 * the folder the server was started from; the default stays beside the code, so
 * the app finds its data wherever it is started.
 */
export function readSettings(env = process.env) {
  return {
    port: readPort(env, 'PORT', DEFAULT_PORT),
    e2ePort: readPort(env, 'E2E_PORT', DEFAULT_E2E_PORT),
    dbFile: env.DB_FILE ? path.resolve(env.DB_FILE) : DEFAULT_DB_FILE,
    staffPin: readStaffPin(env),
    isTestMode: env.NODE_ENV === 'test',
    distDir: path.join(PROJECT_ROOT, 'dist'),
  };
}
