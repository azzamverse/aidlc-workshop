/**
 * The diner session's decisions, with no React in it. Each decision is one of:
 * `ignore`, `close` (BR6.1), `reload`, `check` (read the visit first) or `deliver`.
 */

/** What to do with one live event. */
export function decideEvent({ type, data, heldVisitId, closed, restarting }) {
  // BR6.2: a closed device, or one starting its next visit, reacts to nothing.
  if (closed || restarting) return 'ignore';
  if (type === 'table.closed') return data.visitId === heldVisitId ? 'close' : 'ignore';
  if (type === 'resync') return 'check';
  return 'deliver';
}

/**
 * What a reconnect check found. The board read starts no visit (BR6.2). A table
 * with no visit, or with another visit, means the held visit was closed.
 */
export function decideVisitCheck({ board, tableId, heldVisitId, closed, restarting }) {
  if (closed || restarting) return 'ignore';
  const table = board.tables.find((candidate) => candidate.id === tableId);
  if (!table) return 'reload';
  return table.visitId === heldVisitId ? 'reload' : 'close';
}

/** BR4.3: the notice shows only after a first connection was made. */
export function isReconnecting({ connected, everConnected }) {
  return everConnected && !connected;
}

/** A press on the shell's tab bar: starts the next visit once the table closed. */
export function isTabPress(event) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
  return Boolean(event.target?.closest?.('nav.tabs a'));
}

const STATUS_RANK = { Pending: 0, Preparing: 1, Completed: 2, Cancelled: 2 };

const newestFirst = (orders) => [...orders].sort((a, b) => b.number - a.number);

/**
 * BR4.2: replaces the order with the same id or adds it, ignoring another visit's.
 * A replayed event never moves an order back to an earlier status.
 */
export function mergeOrder(orders, incoming, visitId) {
  if (incoming.visitId !== visitId) return orders;
  const existing = orders.find((order) => order.id === incoming.id);
  if (existing && STATUS_RANK[incoming.status] < STATUS_RANK[existing.status]) return orders;
  return newestFirst([...orders.filter((order) => order.id !== incoming.id), incoming]);
}

/** A fresh read of the visit's orders, newest first. */
export function ordersForVisit(orders, visitId) {
  return newestFirst(orders.filter((order) => order.visitId === visitId));
}

/** BR5.2's sentence for a refused cancel. */
export function cancelRefusedMessage(number, status) {
  if (status === 'Preparing') return `Order #${number} is already being prepared, so it can't be cancelled.`;
  return `Order #${number} is already ${String(status).toLowerCase()}, so it can't be cancelled.`;
}
