import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, placementFor } from './context-helper.js';

describe('estimated wait', () => {
  let context;

  const place = (tableId) => context.ordering.placeOrder(tableId, placementFor(context.tables.openTable(tableId).visitId)).order;
  const readOrder = (tableId, id) => context.tables.listCurrentOrders(tableId).orders.find((order) => order.id === id);

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => context.cleanup());

  it('reads About 10 with no earlier open orders', () => {
    const order = place(5);
    expect(readOrder(5, order.id).estimateMinutes).toBe(10);
  });

  it('adds 3 per earlier open order across all tables: 2 earlier reads 16', () => {
    place(1);
    place(2);
    const order = place(5);
    expect(readOrder(5, order.id).estimateMinutes).toBe(16);
  });

  it('a Preparing order counts and keeps its own estimate', () => {
    const earlier = place(1);
    context.ordering.moveOrder(earlier.id, { from: 'Pending', to: 'Preparing' });
    const order = place(5);
    expect(readOrder(1, earlier.id).estimateMinutes).toBe(10);
    expect(readOrder(5, order.id).estimateMinutes).toBe(13);
  });

  it('finished and later orders do not count', () => {
    const cancelled = place(1);
    context.ordering.cancelOrder(1, cancelled.id);
    const order = place(5);
    place(2);
    expect(readOrder(5, order.id).estimateMinutes).toBe(10);
  });

  it('orders placed in the same instant go by order number', () => {
    const first = place(1);
    const second = place(5);
    context.db.prepare('UPDATE orders SET placed_at = ?').run('2026-11-10T10:00:00.000Z');
    expect(readOrder(1, first.id).estimateMinutes).toBe(10);
    expect(readOrder(5, second.id).estimateMinutes).toBe(13);
  });

  it('Completed and Cancelled orders carry no estimate', () => {
    const order = place(5);
    context.ordering.cancelOrder(5, order.id);
    expect(readOrder(5, order.id)).not.toHaveProperty('estimateMinutes');
  });

  it('is only on the diner\'s read, never on the placed order or the board', () => {
    const order = place(5);
    expect(order).not.toHaveProperty('estimateMinutes');
    const board = context.tables.listBoard().tables.find((table) => table.id === 5);
    expect(board.orders[0]).not.toHaveProperty('estimateMinutes');
  });
});
