/** The staff gate's decisions, with no React in it (BR1.6). */
export const PIN_LENGTH = 4;

const PIN_NOT_CHECKED = "We couldn't check the PIN. Please try again.";

/** What to show after asking whether a session exists; `error` is null when one does. */
export function gateAfterCheck(error) {
  if (!error) return 'open';
  return error.status === 401 ? 'pin' : 'failed';
}

/** The entry after one more digit, ignoring anything beyond the PIN's length. */
export function addDigit(entry, digit) {
  return entry.length >= PIN_LENGTH ? entry : `${entry}${digit}`;
}

export const isPinComplete = (entry) => entry.length === PIN_LENGTH;

/** The words for a refused PIN: the server's for a known refusal, plain ones otherwise. */
export function pinRefusalText(error) {
  return error.code === 'PIN_WRONG' || error.code === 'PIN_LOCKED' ? error.message : PIN_NOT_CHECKED;
}
