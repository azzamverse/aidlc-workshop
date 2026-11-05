import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, placementFor } from './context-helper.js';

const refusal = (status, code) => expect.objectContaining({ status, code });

describe('ordering service', () => {
  let context;
  let visitId;
  let frames;

  const orderCount = () => context.db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
  const place = (overrides, tableId = 5) => context.ordering.placeOrder(tableId, placementFor(visitId, overrides));

  beforeEach(() => {
    context = createTestContext();
    visitId = context.tables.openTable(5).visitId;
    frames = [];
    context.live.subscribe({ send: (frame) => frames.push(frame) });
    frames.length = 0;
  });

  afterEach(() => context.cleanup());

  describe('placing', () => {
    it('creates a Pending order with lines, total and a number', () => {
      const { order, created } = place({
        lines: [
          { itemId: 'coffee', quantity: 2 },
          { itemId: 'cheeseburger', quantity: 1 },
        ],
      });
      expect(created).toBe(true);
      expect(order).toMatchObject({ number: 1, tableId: 5, visitId, status: 'Pending', totalCents: 1650 });
      expect(order.lines).toEqual([
        { name: 'Coffee', quantity: 2, unitPriceCents: 250 },
        { name: 'Cheeseburger', quantity: 1, unitPriceCents: 1150 },
      ]);
    });

    it('publishes order.placed after commit', () => {
      place();
      expect(frames).toHaveLength(1);
      expect(frames[0]).toContain('event: order.placed');
      expect(frames[0]).toContain('"tableId":5');
    });

    it('numbers orders uniquely across tables', () => {
      const otherVisit = context.tables.openTable(2).visitId;
      const first = place().order;
      const second = context.ordering.placeOrder(2, placementFor(otherVisit)).order;
      expect([first.number, second.number]).toEqual([1, 2]);
    });

    it('keeps the line name and price when the menu changes later', () => {
      const { order } = place();
      context.db.prepare("UPDATE menu_items SET name = 'Tea', price_cents = 999 WHERE id = 'coffee'").run();
      const [stored] = context.tables.listCurrentOrders(5).orders;
      expect(stored.lines[0]).toEqual({ name: 'Coffee', quantity: 2, unitPriceCents: 250 });
      expect(stored.totalCents).toBe(order.totalCents);
    });

    it.each([
      ['empty lines', { lines: [] }],
      ['missing lines', { lines: undefined }],
      ['an unknown item', { lines: [{ itemId: 'nope', quantity: 1 }] }],
      ['quantity 0', { lines: [{ itemId: 'coffee', quantity: 0 }] }],
      ['quantity 21', { lines: [{ itemId: 'coffee', quantity: 21 }] }],
      ['a fractional quantity', { lines: [{ itemId: 'coffee', quantity: 1.5 }] }],
      ['a text quantity', { lines: [{ itemId: 'coffee', quantity: '2' }] }],
      ['a null line', { lines: [null] }],
      ['no visitId', { visitId: undefined }],
      ['no placementKey', { placementKey: undefined }],
    ])('refuses %s and stores nothing', (_name, overrides) => {
      expect(() => place(overrides)).toThrowError(refusal(400, 'VALIDATION_FAILED'));
      expect(orderCount()).toBe(0);
      expect(frames).toEqual([]);
    });

    it('accepts the quantity limits 1 and 20', () => {
      expect(place({ lines: [{ itemId: 'coffee', quantity: 1 }] }).created).toBe(true);
      expect(place({ lines: [{ itemId: 'coffee', quantity: 20 }] }).created).toBe(true);
    });

    it('refuses an unknown table', () => {
      expect(() => place({}, 99)).toThrowError(refusal(404, 'TABLE_NOT_FOUND'));
    });

    it('refuses a stale visit with TABLE_CLOSED', () => {
      context.shared.archiveVisit(visitId);
      expect(() => place()).toThrowError(refusal(409, 'TABLE_CLOSED'));
      expect(orderCount()).toBe(0);
    });

    it('a sold-out item stops the whole placement and names the items', () => {
      context.menu.setSoldOut('coffee', true);
      frames.length = 0;
      let refused;
      try {
        place({ lines: [{ itemId: 'coffee', quantity: 1 }, { itemId: 'lemonade', quantity: 1 }] });
      } catch (error) {
        refused = error;
      }
      expect(refused).toMatchObject({ status: 409, code: 'ITEM_SOLD_OUT' });
      expect(refused.details.soldOutItemIds).toEqual(['coffee']);
      expect(orderCount()).toBe(0);
      expect(frames).toEqual([]);
    });

    it('a repeated key returns the first order and publishes nothing more', () => {
      const first = place({ placementKey: 'same' });
      const second = place({ placementKey: 'same' });
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.order.id).toBe(first.order.id);
      expect(orderCount()).toBe(1);
      expect(frames).toHaveLength(1);
    });

    it('a repeated key still returns the order after the table closed', () => {
      const first = place({ placementKey: 'same' });
      context.shared.archiveVisit(visitId);
      expect(place({ placementKey: 'same' }).order.id).toBe(first.order.id);
    });

    it('a key used at another table is refused', () => {
      place({ placementKey: 'same' });
      const otherVisit = context.tables.openTable(2).visitId;
      expect(() =>
        context.ordering.placeOrder(2, placementFor(otherVisit, { placementKey: 'same' })),
      ).toThrowError(refusal(400, 'VALIDATION_FAILED'));
    });
  });

  describe('moving', () => {
    it('moves Pending to Preparing to Completed, publishing each change', () => {
      const { order } = place();
      frames.length = 0;
      expect(context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' }).status).toBe('Preparing');
      expect(context.ordering.moveOrder(order.id, { from: 'Preparing', to: 'Completed' }).status).toBe('Completed');
      expect(frames).toHaveLength(2);
      expect(frames[0]).toContain('event: order.updated');
    });

    it.each([
      ['a skip', 'Pending', 'Completed'],
      ['a backward move', 'Preparing', 'Pending'],
      ['from a final status', 'Completed', 'Preparing'],
      ['to Cancelled', 'Pending', 'Cancelled'],
      ['an unknown status', 'Nope', 'Preparing'],
    ])('refuses %s with 400', (_name, from, to) => {
      const { order } = place();
      expect(() => context.ordering.moveOrder(order.id, { from, to })).toThrowError(
        refusal(400, 'VALIDATION_FAILED'),
      );
      expect(context.tables.listCurrentOrders(5).orders[0].status).toBe('Pending');
    });

    it('checks the move shape before the current status', () => {
      const { order } = place();
      context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' });
      expect(() => context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Completed' })).toThrowError(
        refusal(400, 'VALIDATION_FAILED'),
      );
    });

    it('refuses a stale from with the current status', () => {
      const { order } = place();
      context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' });
      let refused;
      try {
        context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' });
      } catch (error) {
        refused = error;
      }
      expect(refused).toMatchObject({ status: 409, code: 'ORDER_STATE_CONFLICT' });
      expect(refused.details.currentStatus).toBe('Preparing');
    });

    it('refuses an unknown order', () => {
      expect(() => context.ordering.moveOrder('nope', { from: 'Pending', to: 'Preparing' })).toThrowError(
        refusal(404, 'ORDER_NOT_FOUND'),
      );
    });
  });

  describe('cancelling', () => {
    it('cancels a Pending order and publishes it', () => {
      const { order } = place();
      frames.length = 0;
      expect(context.ordering.cancelOrder('5', order.id).status).toBe('Cancelled');
      expect(frames[0]).toContain('event: order.updated');
      expect(frames[0]).toContain('"status":"Cancelled"');
    });

    it('refuses once Preparing, with the current status', () => {
      const { order } = place();
      context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' });
      expect(() => context.ordering.cancelOrder('5', order.id)).toThrowError(
        expect.objectContaining({ code: 'ORDER_STATE_CONFLICT', details: { currentStatus: 'Preparing' } }),
      );
    });

    it('treats another table or an archived visit as not found', () => {
      const { order } = place();
      expect(() => context.ordering.cancelOrder('2', order.id)).toThrowError(refusal(404, 'ORDER_NOT_FOUND'));
      context.shared.archiveVisit(visitId);
      expect(() => context.ordering.cancelOrder('5', order.id)).toThrowError(refusal(404, 'ORDER_NOT_FOUND'));
    });

    it('a cancel then a move: the first wins and one event is sent', () => {
      const { order } = place();
      frames.length = 0;
      context.ordering.cancelOrder('5', order.id);
      expect(() => context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' })).toThrowError(
        expect.objectContaining({ code: 'ORDER_STATE_CONFLICT', details: { currentStatus: 'Cancelled' } }),
      );
      expect(frames).toHaveLength(1);
    });

    it('concurrent cancel and move: exactly one wins, whichever arrives first', async () => {
      const { order } = place();
      frames.length = 0;
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => context.ordering.moveOrder(order.id, { from: 'Pending', to: 'Preparing' })),
        Promise.resolve().then(() => context.ordering.cancelOrder('5', order.id)),
      ]);
      expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['fulfilled', 'rejected']);
      const winner = outcomes.find((outcome) => outcome.status === 'fulfilled').value;
      expect(context.tables.listCurrentOrders(5).orders[0].status).toBe(winner.status);
      expect(frames).toHaveLength(1);
    });
  });
});
