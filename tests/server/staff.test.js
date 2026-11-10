import { describe, expect, it, vi } from 'vitest';
import {
  LOCKOUT_MS,
  MAX_SESSIONS,
  MAX_TRACKED_ADDRESSES,
  MAX_WRONG_TRIES,
  SESSION_COOKIE,
  createStaffService,
} from '../../server/staff/service.js';
import { readSettings } from '../../server/platform/settings.js';
import { createTestLog } from './helpers.js';

const PIN = '4826';
const ADDRESS = '10.0.0.5';

function createService() {
  const clock = { value: 1_000_000 };
  const log = { ...createTestLog(), info: vi.fn() };
  const staff = createStaffService({ pin: PIN, log, now: () => clock.value });
  return { staff, clock, log };
}

const codeOf = (attempt) => {
  try {
    attempt();
  } catch (error) {
    return error.code;
  }
  return 'NO_ERROR';
};
const tryWrong = (staff, address = ADDRESS) => codeOf(() => staff.signIn('0000', address));
const cookieFor = (token) => `other=1; ${SESSION_COOKIE}=${token}`;

function middlewareResult(staff, cookie) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  staff.requireStaff({ get: () => cookie }, res, next);
  return { res, next };
}

describe('staff PIN', () => {
  it('uses STAFF_PIN and never prints it', () => {
    const { staff, log } = createService();
    expect(staff.hasSession(cookieFor(staff.signIn(PIN, ADDRESS)))).toBe(true);
    expect(JSON.stringify(log.info.mock.calls)).not.toContain(PIN);
  });

  it('creates and prints a random 4-digit PIN when none is set', () => {
    const log = { ...createTestLog(), info: vi.fn() };
    const staff = createStaffService({ pin: null, log });
    const [message] = log.info.mock.calls[0];
    const printed = /\b(\d{4})$/.exec(message)?.[1];
    expect(printed).toBeTruthy();
    expect(staff.hasSession(cookieFor(staff.signIn(printed, ADDRESS)))).toBe(true);
  });

  it.each([undefined, null, 4826, {}, '', '48261'])('a wrong or non-text PIN (%s) opens nothing', (pin) => {
    const { staff } = createService();
    expect(codeOf(() => staff.signIn(pin, ADDRESS))).toBe('PIN_WRONG');
  });

  it('reads STAFF_PIN from settings, and refuses one that could never be entered', () => {
    expect(readSettings({ STAFF_PIN: '0042' }).staffPin).toBe('0042');
    expect(readSettings({}).staffPin).toBeNull();
    expect(() => readSettings({ STAFF_PIN: '12a4' })).toThrow(/Invalid setting STAFF_PIN/);
  });
});

describe('lockout', () => {
  it('the first four wrong tries answer PIN_WRONG and the fifth PIN_LOCKED', () => {
    const { staff } = createService();
    const codes = Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    expect(codes).toEqual(['PIN_WRONG', 'PIN_WRONG', 'PIN_WRONG', 'PIN_WRONG', 'PIN_LOCKED']);
  });

  it('refuses even the right PIN while locked', () => {
    const { staff, clock } = createService();
    Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    clock.value += LOCKOUT_MS - 1;
    expect(codeOf(() => staff.signIn(PIN, ADDRESS))).toBe('PIN_LOCKED');
  });

  it('after 30 seconds the count starts again', () => {
    const { staff, clock } = createService();
    Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    clock.value += LOCKOUT_MS;
    expect(tryWrong(staff)).toBe('PIN_WRONG');
    expect(tryWrong(staff)).toBe('PIN_WRONG');
  });

  it('a correct PIN clears the count', () => {
    const { staff } = createService();
    Array.from({ length: MAX_WRONG_TRIES - 1 }, () => tryWrong(staff));
    staff.signIn(PIN, ADDRESS);
    Array.from({ length: MAX_WRONG_TRIES - 1 }, () => expect(tryWrong(staff)).toBe('PIN_WRONG'));
  });

  it('locks one address only', () => {
    const { staff } = createService();
    Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    expect(staff.hasSession(cookieFor(staff.signIn(PIN, '10.0.0.6')))).toBe(true);
  });

  it(`tracks at most ${MAX_TRACKED_ADDRESSES} addresses, forgetting the oldest unlocked one`, () => {
    const { staff } = createService();
    Array.from({ length: MAX_WRONG_TRIES - 1 }, () => tryWrong(staff));
    for (let count = 0; count < MAX_TRACKED_ADDRESSES; count += 1) tryWrong(staff, `10.1.${Math.floor(count / 250)}.${count % 250}`);
    expect(tryWrong(staff)).toBe('PIN_WRONG');
  });

  it('never forgets a locked address to make room', () => {
    const { staff } = createService();
    Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    for (let count = 0; count < MAX_TRACKED_ADDRESSES; count += 1) tryWrong(staff, `10.1.${Math.floor(count / 250)}.${count % 250}`);
    expect(tryWrong(staff)).toBe('PIN_LOCKED');
  });

  it('resetLockout lets a locked address try again', () => {
    const { staff } = createService();
    Array.from({ length: MAX_WRONG_TRIES }, () => tryWrong(staff));
    staff.resetLockout();
    expect(staff.hasSession(cookieFor(staff.signIn(PIN, ADDRESS)))).toBe(true);
  });
});

describe('sessions', () => {
  it('requireStaff calls next for a valid session', () => {
    const { staff } = createService();
    const { next, res } = middlewareResult(staff, cookieFor(staff.signIn(PIN, ADDRESS)));
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'staff_session=made-up', 'nothing'])('requireStaff answers 401 STAFF_REQUIRED and stops for %s', (cookie) => {
    const { staff } = createService();
    const { next, res } = middlewareResult(staff, cookie);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('STAFF_REQUIRED');
  });

  it(`keeps at most ${MAX_SESSIONS} sessions, dropping the oldest`, () => {
    const { staff } = createService();
    const oldest = staff.signIn(PIN, ADDRESS);
    const second = staff.signIn(PIN, ADDRESS);
    for (let count = 2; count < MAX_SESSIONS; count += 1) staff.signIn(PIN, ADDRESS);
    expect(staff.hasSession(cookieFor(oldest))).toBe(true);
    staff.signIn(PIN, ADDRESS);
    expect(staff.hasSession(cookieFor(oldest))).toBe(false);
    expect(staff.hasSession(cookieFor(second))).toBe(true);
  });
});
