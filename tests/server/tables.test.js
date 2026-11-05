import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, placementFor } from './context-helper.js';

describe('tables service', () => {
  let context;

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => context.cleanup());

  it('starts a visit the first time a table is opened and keeps it after', () => {
    const first = context.tables.openTable('5');
    expect(first).toMatchObject({ id: 5, label: 'Table 5' });
    expect(first.visitId).toBeTruthy();
    expect(context.tables.openTable(5).visitId).toBe(first.visitId);
  });

  it.each(['0', '11', '99', 'abc', '5.5', '5abc', '-1', ''])('refuses the table address "%s"', (address) => {
    expect(() => context.tables.openTable(address)).toThrowError(
      expect.objectContaining({ status: 404, code: 'TABLE_NOT_FOUND' }),
    );
  });

  it('getCurrentVisit returns null without starting a visit', () => {
    expect(context.shared.getCurrentVisit(5)).toBeNull();
    expect(context.shared.getCurrentVisit(5)).toBeNull();
  });

  it('getCurrentVisit returns the open visit', () => {
    const { visitId } = context.tables.openTable(5);
    expect(context.shared.getCurrentVisit(5)).toMatchObject({ id: visitId, tableId: 5, status: 'Open' });
  });

  it('the board lists 10 tables and starts no visit', () => {
    const { tables } = context.tables.listBoard();
    expect(tables).toHaveLength(10);
    expect(tables[0]).toEqual({ id: 1, label: 'Table 1', visitId: null, orders: [] });
    expect(context.shared.getCurrentVisit(1)).toBeNull();
  });

  it('the orders read shows the visit newest first, and an empty list with no visit', () => {
    expect(context.tables.listCurrentOrders(5)).toEqual({ orders: [] });
    const { visitId } = context.tables.openTable(5);
    context.ordering.placeOrder(5, placementFor(visitId));
    context.ordering.placeOrder(5, placementFor(visitId));
    const numbers = context.tables.listCurrentOrders(5).orders.map((order) => order.number);
    expect(numbers).toEqual([2, 1]);
  });

  it('archiveVisit closes the visit, and the next open starts a new one', () => {
    const { visitId } = context.tables.openTable(5);
    context.shared.archiveVisit(visitId);
    expect(context.shared.getCurrentVisit(5)).toBeNull();
    expect(context.tables.openTable(5).visitId).not.toBe(visitId);
  });

  it('archiving keeps the orders stored but off the current reads', () => {
    const { visitId } = context.tables.openTable(5);
    context.ordering.placeOrder(5, placementFor(visitId));
    context.shared.archiveVisit(visitId);
    expect(context.shared.listVisitOrders(visitId)).toHaveLength(1);
    expect(context.tables.listCurrentOrders(5)).toEqual({ orders: [] });
  });

  it('archiving a visit that is not open returns an error', () => {
    const { visitId } = context.tables.openTable(5);
    context.shared.archiveVisit(visitId);
    expect(() => context.shared.archiveVisit(visitId)).toThrowError(
      expect.objectContaining({ code: 'VISIT_NOT_OPEN' }),
    );
  });

  it('archive and event roll back together in the caller transaction, sending nothing', () => {
    const frames = [];
    context.live.subscribe({ send: (frame) => frames.push(frame) });
    frames.length = 0;
    const { visitId } = context.tables.openTable(5);
    expect(() =>
      context.shared.withTransaction(() => {
        context.shared.archiveVisit(visitId);
        context.shared.publishEvent({ type: 'table.closed', tableId: 5, visitId });
        throw new Error('stop');
      }),
    ).toThrow('stop');
    expect(context.shared.getCurrentVisit(5).id).toBe(visitId);
    expect(frames).toEqual([]);
  });
});
