import { describe, expect, it } from 'vitest';
import { addDigit, gateAfterCheck, isPinComplete, pinRefusalText } from '../../client/src/shell/staffGate.js';

describe('gateAfterCheck', () => {
  it('opens the page when a session exists', () => {
    expect(gateAfterCheck(null)).toBe('open');
  });

  it('shows the PIN screen on a 401', () => {
    expect(gateAfterCheck({ status: 401, code: 'STAFF_REQUIRED' })).toBe('pin');
  });

  it.each([[500], [null]])('never opens the page on status %s', (status) => {
    expect(gateAfterCheck({ status })).toBe('failed');
  });
});

describe('PIN entry', () => {
  it('adds digits in order', () => {
    expect(addDigit(addDigit('', '1'), '2')).toBe('12');
  });

  it('ignores digits past the fourth', () => {
    expect(addDigit('1234', '5')).toBe('1234');
  });

  it('is complete at exactly four digits', () => {
    expect(isPinComplete('123')).toBe(false);
    expect(isPinComplete('1234')).toBe(true);
  });
});

describe('pinRefusalText', () => {
  it.each(['PIN_WRONG', 'PIN_LOCKED'])('uses the server\'s words for %s', (code) => {
    expect(pinRefusalText({ code, message: 'The words' })).toBe('The words');
  });

  it('uses plain words for anything else, never a raw message', () => {
    expect(pinRefusalText({ code: null, message: 'TypeError: x' })).toBe("We couldn't check the PIN. Please try again.");
    expect(pinRefusalText({ code: 'INTERNAL_ERROR', message: 'boom' })).toBe("We couldn't check the PIN. Please try again.");
  });
});
