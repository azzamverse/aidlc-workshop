/** The order-ready banner's decisions, with no React in it (BR1.1 to BR1.5). */

const storageKey = (tableId) => `table-order.notify.${tableId}`;
const STATUS_RANK = { Pending: 0, Preparing: 1, Completed: 2, Cancelled: 2 };
const WAS_OPEN = new Set(['Pending', 'Preparing']);

export const emptyState = (visitId) => ({ visitId, lastSeen: {}, dismissed: [] });

function parseSaved(storage, tableId) {
  try {
    const saved = JSON.parse(storage.getItem(storageKey(tableId)));
    const isUsable = saved && typeof saved.lastSeen === 'object' && saved.lastSeen !== null && Array.isArray(saved.dismissed);
    return isUsable ? saved : null;
  } catch {
    return null; // Unreadable device storage counts as empty.
  }
}

/** What this device remembers for the visit; another visit's memory counts as nothing. */
export function readState(storage, tableId, visitId) {
  const saved = parseSaved(storage, tableId);
  return saved?.visitId === visitId ? saved : emptyState(visitId);
}

/** Dismissals from another tab of this browser are kept. */
export function saveState(storage, tableId, state) {
  const saved = parseSaved(storage, tableId);
  const dismissed = saved?.visitId === state.visitId ? [...new Set([...saved.dismissed, ...state.dismissed])] : state.dismissed;
  try {
    storage.setItem(storageKey(tableId), JSON.stringify({ ...state, dismissed }));
  } catch (error) {
    console.warn('The banner memory could not be saved on this device.', error);
  }
}

/**
 * Compares orders with what this device last saw, then records them. Returns the
 * new state and the orders to announce: Completed, last seen open, not dismissed.
 * Orders never seen, and orders of another visit, are never announced (BR1.5).
 */
export function observeOrders(state, visitId, orders) {
  const current = state.visitId === visitId ? state : emptyState(visitId);
  const lastSeen = { ...current.lastSeen };
  const ready = [];
  for (const order of orders) {
    if (order.visitId !== visitId) continue;
    const last = lastSeen[order.id];
    // An older read arriving late never moves an order back.
    if (last !== undefined && STATUS_RANK[order.status] < STATUS_RANK[last]) continue;
    if (order.status === 'Completed' && WAS_OPEN.has(last) && !current.dismissed.includes(order.id)) ready.push(order);
    lastSeen[order.id] = order.status;
  }
  return { state: { ...current, lastSeen }, ready };
}

/** One banner for one read: the order's number, or a count for several (BR1.4). */
export function bannerFor(readyOrders) {
  return {
    orderIds: readyOrders.map((order) => order.id),
    text: readyOrders.length === 1 ? `Order #${readyOrders[0].number} is ready` : `${readyOrders.length} orders are ready`,
  };
}

export function dismissOrders(state, orderIds) {
  return { ...state, dismissed: [...new Set([...state.dismissed, ...orderIds])] };
}
