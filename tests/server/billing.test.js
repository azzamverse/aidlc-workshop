import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBillingService } from '../../server/billing/service.js';
import { createTestContext, placementFor } from './context-helper.js';

const TABLE = 5;

describe('Billing service', () => {
  let context;
  let billing;
  let events;
  let stopListening;

  const place = (visitId, lines) => context.ordering.placeOrder(TABLE, placementFor(visitId, lines ? { lines } : {})).order;
  const openVisit = () => context.tables.openTable(TABLE).visitId;
  const complete = (order) => {
    context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' });
    context.ordering.moveOrder(order.id, { from: 'Preparing', to: 'Completed' });
  };

  beforeEach(() => {
    context = createTestContext();
    billing = createBillingService({ shared: context.shared, requireTable: context.tables.requireTable });
    events = [];
    stopListening = context.live.subscribe({ send: (frame) => events.push(frame) });
    events.length = 0;
  });

  afterEach(() => {
    stopListening();
    context.cleanup();
  });

  it('adds up the listed orders to the cent, oldest first, including open ones', () => {
    const visitId = openVisit();
    const first = place(visitId, [{ itemId: 'coffee', quantity: 3 }]);
    const second = place(visitId, [{ itemId: 'garlic-bread', quantity: 7 }]);
    const bill = billing.getBill(TABLE);
    expect(bill.orders.map((order) => order.id)).toEqual([first.id, second.id]);
    expect(bill.totalCents).toBe(750 + 3150);
    expect(bill.tableId).toBe(TABLE);
  });

  it('leaves cancelled orders off and names the open ones', () => {
    const visitId = openVisit();
    const cancelled = place(visitId);
    const preparing = place(visitId);
    const pending = place(visitId);
    context.ordering.cancelOrder(TABLE, cancelled.id);
    context.ordering.moveOrder(preparing.id, { from: 'Pending', to: 'Preparing' });
    const bill = billing.getBill(TABLE);
    expect(bill.orders).toHaveLength(2);
    expect(bill.openOrders).toEqual([
      { number: preparing.number, status: 'Preparing' },
      { number: pending.number, status: 'Pending' },
    ]);
    expect(bill.canClose).toBe(false);
  });

  it('gives an empty bill with no visit, and reading it does not start one', () => {
    expect(billing.getBill(TABLE)).toEqual({ tableId: TABLE, orders: [], openOrders: [], totalCents: 0, canClose: false });
    expect(context.shared.getCurrentVisit(TABLE)).toBeFalsy();
  });

  it('refuses an unknown table', () => {
    expect(() => billing.getBill(99)).toThrowError(expect.objectContaining({ code: 'TABLE_NOT_FOUND' }));
    expect(() => billing.closeTable('abc')).toThrowError(expect.objectContaining({ code: 'TABLE_NOT_FOUND' }));
  });

  it('closes a finished visit, archives it and sends table.closed once', () => {
    const visitId = openVisit();
    complete(place(visitId));
    events.length = 0;
    expect(billing.getBill(TABLE).canClose).toBe(true);
    expect(billing.closeTable(TABLE)).toEqual({ closed: true });
    expect(context.shared.getCurrentVisit(TABLE)).toBeFalsy();
    expect(billing.getBill(TABLE).orders).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0]).toContain('table.closed');
    expect(events[0]).toContain(visitId);
  });

  it('closes an all-cancelled visit with a total of zero', () => {
    const order = place(openVisit());
    context.ordering.cancelOrder(TABLE, order.id);
    const bill = billing.getBill(TABLE);
    expect(bill).toMatchObject({ orders: [], totalCents: 0, canClose: true });
    expect(billing.closeTable(TABLE)).toEqual({ closed: true });
  });

  it.each([
    ['an open order', (visitId) => place(visitId)],
    ['no orders', () => {}],
  ])('refuses a visit with %s and changes nothing', (_name, arrange) => {
    const visitId = openVisit();
    arrange(visitId);
    events.length = 0;
    expect(() => billing.closeTable(TABLE)).toThrowError(expect.objectContaining({ status: 409, code: 'TABLE_NOT_READY' }));
    expect(context.shared.getCurrentVisit(TABLE).id).toBe(visitId);
    expect(events).toEqual([]);
  });

  it('a repeat close changes nothing, answers success and sends no event', () => {
    complete(place(openVisit()));
    billing.closeTable(TABLE);
    events.length = 0;
    expect(billing.closeTable(TABLE)).toEqual({ closed: true });
    expect(events).toEqual([]);
    expect(context.shared.getCurrentVisit(TABLE)).toBeFalsy();
  });

  it('a failed close rolls back, with no event', () => {
    const visitId = openVisit();
    complete(place(visitId));
    events.length = 0;
    const failing = createBillingService({
      shared: {
        ...context.shared,
        publishEvent() {
          throw new Error('event store failed');
        },
      },
      requireTable: context.tables.requireTable,
    });
    expect(() => failing.closeTable(TABLE)).toThrow('event store failed');
    expect(context.shared.getCurrentVisit(TABLE).id).toBe(visitId);
    expect(events).toEqual([]);
  });

  it('the next diner starts a new visit with an empty bill', () => {
    const visitId = openVisit();
    complete(place(visitId));
    billing.closeTable(TABLE);
    expect(openVisit()).not.toBe(visitId);
    expect(billing.getBill(TABLE)).toMatchObject({ orders: [], canClose: false });
  });
});
