import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { AppError, toErrorBody } from '../platform/errors.js';

export const SESSION_COOKIE = 'staff_session';
export const MAX_WRONG_TRIES = 5;
export const LOCKOUT_MS = 30_000;
export const MAX_SESSIONS = 1000;
export const MAX_TRACKED_ADDRESSES = 1000;

const pinLocked = () =>
  new AppError(429, 'PIN_LOCKED', 'Too many wrong tries. Please try again in 30 seconds.');
const pinWrong = () => new AppError(401, 'PIN_WRONG', "That PIN isn't right");
const staffRequired = () => new AppError(401, 'STAFF_REQUIRED', 'Please enter the staff PIN.');

const digestOf = (text) => createHash('sha256').update(text).digest();

function readCookie(header, name) {
  for (const part of (header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

/**
 * The staff PIN, the signed-in browsers and the lockout (BR1.1 to BR1.5). Sessions
 * and wrong-try counts live in memory, so a server restart ends them.
 */
export function createStaffService({ pin, log, now = Date.now }) {
  const activePin = pin || String(randomInt(0, 10_000)).padStart(4, '0');
  // BR1.5: printing the generated PIN is how the team learns it.
  if (!pin) log.info(`No STAFF_PIN is set. The staff PIN for this run is ${activePin}`);
  const pinDigest = digestOf(activePin);

  const sessions = new Map();
  const attempts = new Map();

  /** Hashing first gives both sides the same length, as the constant-time compare needs. */
  const isCorrectPin = (candidate) =>
    typeof candidate === 'string' && timingSafeEqual(digestOf(candidate), pinDigest);

  function removeSpentAttempts() {
    for (const [address, entry] of attempts) {
      if (entry.lockedUntil !== null && entry.lockedUntil <= now()) attempts.delete(address);
    }
  }

  function createSession() {
    const token = randomBytes(32).toString('hex');
    sessions.set(token, now());
    // A Map keeps insertion order, so the first key is the oldest session.
    if (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
    return token;
  }

  /** Keeps the map bounded; a Map keeps insertion order and a locked address is never forgotten. */
  function forgetOldestUnlockedAddress() {
    if (attempts.size <= MAX_TRACKED_ADDRESSES) return;
    for (const [address, entry] of attempts) {
      if (entry.lockedUntil === null) {
        attempts.delete(address);
        return;
      }
    }
  }

  /** The address is Express's req.ip: the app is served directly, not behind a proxy. */
  function recordWrongTry(address) {
    const entry = attempts.get(address) ?? { wrongCount: 0, lockedUntil: null };
    entry.wrongCount += 1;
    attempts.set(address, entry);
    forgetOldestUnlockedAddress();
    if (entry.wrongCount >= MAX_WRONG_TRIES) {
      entry.lockedUntil = now() + LOCKOUT_MS;
      log.info('Staff PIN locked for an address after repeated wrong tries');
      throw pinLocked();
    }
    log.info('Staff PIN refused');
    throw pinWrong();
  }

  /** Returns a new session token, or throws PIN_WRONG or PIN_LOCKED. */
  function signIn(candidate, address) {
    removeSpentAttempts();
    if (attempts.get(address)?.lockedUntil) {
      log.info('Staff PIN try refused during a lockout');
      throw pinLocked();
    }
    if (!isCorrectPin(candidate)) recordWrongTry(address);
    attempts.delete(address);
    return createSession();
  }

  const hasSession = (cookieHeader) => sessions.has(readCookie(cookieHeader, SESSION_COOKIE));

  /** Express middleware: with no valid session it answers 401 and stops (BR1.1). */
  function requireStaff(req, res, next) {
    if (hasSession(req.get('Cookie'))) {
      next();
      return;
    }
    const refusal = staffRequired();
    res.status(refusal.status).json(toErrorBody(refusal));
  }

  return { signIn, hasSession, requireStaff, resetLockout: () => attempts.clear() };
}
