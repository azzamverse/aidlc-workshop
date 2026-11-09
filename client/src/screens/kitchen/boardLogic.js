/** The board's decisions, with no React in it. */

const STATUS_RANK = { Pending: 0, Preparing: 1, Completed: 2, Cancelled: 2 };

const NEXT_MOVE = {
  Pending: { to: 'Preparing', label: 'Start preparing' },
  Preparing: { to: 'Completed', label: 'Mark completed' },
};

/** BR2.1: replaces or adds an order, newest first. A replayed event never moves one back. */
export function mergeOrder(tables, order) {
  return tables.map((table) => {
    if (table.id !== order.tableId) return table;
    const existing = table.orders.find((candidate) => candidate.id === order.id);
    if (existing && STATUS_RANK[order.status] < STATUS_RANK[existing.status]) return table;
    const others = table.orders.filter((candidate) => candidate.id !== order.id);
    return { ...table, orders: [...others, order].sort((a, b) => b.number - a.number) };
  });
}

/** BR2.3: a read that started before a live change never overwrites that change. */
export function applyRead(readTables, changesSinceReadStarted) {
  return changesSinceReadStarted.reduce(mergeOrder, readTables);
}

/** BR2.4: what a close does when the reload after it fails. */
export function clearTables(tables, tableIds) {
  return tables.map((table) => (tableIds.includes(table.id) ? { ...table, orders: [] } : table));
}

/** BR2.2: nothing is stored on the device, so every screen and a refresh agree. */
export const isNew = (order) => order.status === 'Pending';

/** BR3.1: the one step forward, or null. */
export const moveOffered = (status) => NEXT_MOVE[status] ?? null;

/** BR3.2's sentence for a refused move. */
export function moveRefusedMessage(number, status) {
  if (status === 'Cancelled') return `Order #${number} was just cancelled by the diner, so it can't be moved on.`;
  return `Order #${number} is already ${String(status).toLowerCase()}, so it can't be moved on.`;
}
