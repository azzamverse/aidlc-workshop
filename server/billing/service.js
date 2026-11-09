import { AppError } from '../platform/errors.js';

const OPEN_STATUSES = new Set(['Pending', 'Preparing']);

const isOpen = (order) => OPEN_STATUSES.has(order.status);
const oldestFirst = (orders) => [...orders].sort((a, b) => a.number - b.number);

/**
 * Contract C3, built only on contract C4 (`shared`) and `requireTable`. A bill is a
 * calculation over the current visit, so it is never stored and starts no visit.
 */
export function createBillingService({ shared, requireTable }) {
  function getBill(rawTableId) {
    const table = requireTable(rawTableId);
    const visit = shared.getCurrentVisit(table.id);
    const all = visit ? oldestFirst(shared.listVisitOrders(visit.id)) : [];
    const orders = all.filter((order) => order.status !== 'Cancelled');
    const openOrders = all.filter(isOpen).map(({ number, status }) => ({ number, status }));
    return {
      tableId: table.id,
      orders,
      openOrders,
      totalCents: orders.reduce((total, order) => total + order.totalCents, 0),
      canClose: all.length > 0 && openOrders.length === 0,
    };
  }

  /** Synchronous inside the transaction, which refuses async work. The event goes out after commit. */
  function closeTable(rawTableId) {
    const table = requireTable(rawTableId);
    return shared.withTransaction(() => {
      const visit = shared.getCurrentVisit(table.id);
      if (!visit) return { closed: true };
      const orders = shared.listVisitOrders(visit.id);
      if (orders.length === 0 || orders.some(isOpen)) {
        throw new AppError(409, 'TABLE_NOT_READY', 'This table cannot be closed until it has orders and all of them are finished.');
      }
      shared.archiveVisit(visit.id);
      shared.publishEvent({ type: 'table.closed', tableId: table.id, visitId: visit.id });
      return { closed: true };
    });
  }

  return { getBill, closeTable };
}
