/** Waiter and bill requests: what they say, and how the lists change. No React in it. */

export const REQUEST_KINDS = ['waiter', 'bill'];

const DINER_WORDS = {
  waiter: { idle: 'Call the waiter', waiting: 'Waiter called · staff told' },
  bill: { idle: 'Ask for the bill', waiting: 'Bill requested · staff told' },
};
const BOARD_WORDS = { waiter: 'Waiter called', bill: 'Bill requested' };

export const dinerButtonText = (kind, isWaiting) => DINER_WORDS[kind][isWaiting ? 'waiting' : 'idle'];
export const boardRequestText = (kind) => BOARD_WORDS[kind];

/** A live change to one table's waiting kinds. */
export function applyRequestChange(waitingKinds, { kind, status }) {
  const others = waitingKinds.filter((candidate) => candidate !== kind);
  return status === 'waiting' ? [...others, kind] : others;
}

export const kindsOf = (requests) => requests.map((request) => request.kind);

/** The board's requests for one card, in a steady order. */
export const requestsOfTable = (requests, tableId) =>
  requests
    .filter((request) => request.tableId === tableId)
    .sort((a, b) => REQUEST_KINDS.indexOf(a.kind) - REQUEST_KINDS.indexOf(b.kind));

export const withoutTable = (requests, tableId) => requests.filter((request) => request.tableId !== tableId);
export const withoutRequest = (requests, requestId) => requests.filter((request) => request.id !== requestId);

/** A new-order alert, or null when this page has already announced the order (a replay). */
export function newOrderAlert(seenOrderIds, order, tables) {
  if (seenOrderIds.has(order.id)) return null;
  seenOrderIds.add(order.id);
  const label = tables.find((table) => table.id === order.tableId)?.label ?? `Table ${order.tableId}`;
  return { id: order.id, number: order.number, text: `New order #${order.number} at ${label}` };
}
