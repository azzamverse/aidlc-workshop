import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../../server/platform/db.js';

/** A silent logger that remembers failures, so tests can check they were logged. */
export function createTestLog() {
  const errors = [];
  return {
    errors,
    info: () => {},
    error: (message, error) => errors.push({ message, error }),
  };
}

export function createTempFolder() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'table-order-test-'));
}

/** A fresh temporary database file. Call cleanup when the test ends. */
export function createTempDatabase() {
  const folder = createTempFolder();
  const dbFile = path.join(folder, 'nested', 'test.db');
  return {
    dbFile,
    open: () => openDatabase(dbFile),
    cleanup: () => fs.rmSync(folder, { recursive: true, force: true }),
  };
}
