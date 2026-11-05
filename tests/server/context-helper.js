import fs from 'node:fs';
import path from 'node:path';
import { createContext } from '../../server/context.js';
import { createTempFolder, createTestLog } from './helpers.js';

/** A whole server context on a fresh temporary database, without a port. */
export function createTestContext(options = {}) {
  const folder = createTempFolder();
  const log = createTestLog();
  const context = createContext({ dbFile: path.join(folder, 'test.db'), log, ...options });
  return {
    ...context,
    folder,
    log,
    cleanup() {
      context.close();
      fs.rmSync(folder, { recursive: true, force: true });
    },
  };
}

/** A valid placement body. Tests change only the field they are about. */
export function placementFor(visitId, overrides = {}) {
  return {
    visitId,
    placementKey: `key-${Math.random()}`,
    lines: [{ itemId: 'coffee', quantity: 2 }],
    ...overrides,
  };
}
