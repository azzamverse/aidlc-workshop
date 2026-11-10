import fs from 'node:fs';
import path from 'node:path';
import { createContext } from '../../server/context.js';
import request from 'supertest';
import { createTempFolder, createTestLog } from './helpers.js';

export const TEST_PIN = '4826';

/** A staff browser: `staff` keeps the session cookie, and `cookie` is its header value. */
export async function signInStaff(app, pin = TEST_PIN) {
  const staff = request.agent(app);
  const response = await staff.post('/api/staff/session').send({ pin });
  if (response.status !== 204) throw new Error(`The test sign-in failed with ${response.status}`);
  return { staff, cookie: response.headers['set-cookie'][0].split(';')[0] };
}

/** A whole server context on a fresh temporary database, without a port. */
export function createTestContext(options = {}) {
  const folder = createTempFolder();
  const log = createTestLog();
  const context = createContext({ dbFile: path.join(folder, 'test.db'), log, staffPin: TEST_PIN, ...options });
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
