export const SPIN_DURATION_MS = 5000;
export const MIN_SEATS = 2;
export const MAX_SEATS = 8;

export const QUESTIONS = [
  { id: 'tab', label: 'Who picks up the tab?' },
  { id: 'dessert', label: 'Who orders dessert?' },
];

/**
 * W4: time left on this screen, from the server's elapsed time at receipt and the
 * time since this screen received it. Never compares the device clock to startedAt.
 */
export function remainingMs(elapsedMs, sinceReceiptMs) {
  return Math.min(SPIN_DURATION_MS, Math.max(0, SPIN_DURATION_MS - elapsedMs - sinceReceiptMs));
}

/**
 * The phase to show for a spin. A phase worked out for an earlier spin never applies
 * to a new one: until its own phase is set the new spin is `pending`.
 */
export function phaseForSpin(phaseState, spinId) {
  if (spinId === null) return 'idle';
  return phaseState.spinId === spinId ? phaseState.phase : 'pending';
}

export const clampSeats = (seats) => Math.min(MAX_SEATS, Math.max(MIN_SEATS, seats));

export function resultSentence({ question, resultSeat }) {
  return question === 'dessert' ? `Seat ${resultSeat} orders dessert!` : `Seat ${resultSeat} picks up the tab!`;
}
