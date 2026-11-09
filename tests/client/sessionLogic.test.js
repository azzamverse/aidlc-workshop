import { describe, expect, it } from 'vitest';
import {
  cancelRefusedMessage,
  decideEvent,
  decideVisitCheck,
  isReconnecting,
  isTabPress,
  mergeOrder,
  ordersForVisit,
} from '../../client/src/screens/diner/sessionLogic.js';

const held = { heldVisitId: 'visit-1', closed: false, restarting: false };

describe('live events', () => {
  it('closes on table.closed for the visit held', () => {
    expect(decideEvent({ ...held, type: 'table.closed', data: { visitId: 'visit-1' } })).toBe('close');
  });

  it('ignores table.closed for another visit, so a replay cannot wipe a new cart', () => {
    expect(decideEvent({ ...held, type: 'table.closed', data: { visitId: 'old' } })).toBe('ignore');
  });

  it('checks the visit on a resync, which may hide a close', () => {
    expect(decideEvent({ ...held, type: 'resync', data: {} })).toBe('check');
  });

  it('passes other events to the screen', () => {
    expect(decideEvent({ ...held, type: 'order.updated', data: {} })).toBe('deliver');
  });

  it.each([
    ['closed', { closed: true }],
    ['starting its next visit', { restarting: true }],
  ])('ignores every event while %s', (_name, state) => {
    for (const type of ['order.placed', 'menu.item-updated', 'resync', 'table.closed']) {
      expect(decideEvent({ ...held, ...state, type, data: { visitId: 'visit-1' } })).toBe('ignore');
    }
  });
});

describe('the visit check on a new connection', () => {
  const board = (visitId) => ({ tables: [{ id: 5, visitId }, { id: 6, visitId: 'other' }] });

  it('reloads when the visit is still the one held', () => {
    expect(decideVisitCheck({ ...held, tableId: 5, board: board('visit-1') })).toBe('reload');
  });

  it('closes when the table has a different visit', () => {
    expect(decideVisitCheck({ ...held, tableId: 5, board: board('visit-2') })).toBe('close');
  });

  it('closes when the table has no visit', () => {
    expect(decideVisitCheck({ ...held, tableId: 5, board: board(null) })).toBe('close');
  });

  it('does nothing while closed, and does not adopt the new visit', () => {
    expect(decideVisitCheck({ ...held, closed: true, tableId: 5, board: board('visit-2') })).toBe('ignore');
  });

  it('does nothing while the next visit is starting', () => {
    expect(decideVisitCheck({ ...held, restarting: true, tableId: 5, board: board(null) })).toBe('ignore');
  });

  it('reloads when the board does not list the table', () => {
    expect(decideVisitCheck({ ...held, tableId: 9, board: board('visit-1') })).toBe('reload');
  });
});

describe('the reconnecting notice', () => {
  it('shows only after a first connection', () => {
    expect(isReconnecting({ connected: false, everConnected: false })).toBe(false);
    expect(isReconnecting({ connected: false, everConnected: true })).toBe(true);
    expect(isReconnecting({ connected: true, everConnected: true })).toBe(false);
  });
});

describe('a tab press', () => {
  const pressOn = (matches, extra = {}) => ({
    button: 0,
    target: { closest: () => (matches ? {} : null) },
    ...extra,
  });

  it('is a plain press inside the tab bar', () => {
    expect(isTabPress(pressOn(true))).toBe(true);
  });

  it('is not a press elsewhere, or one opening a new browser tab', () => {
    expect(isTabPress(pressOn(false))).toBe(false);
    expect(isTabPress(pressOn(true, { ctrlKey: true }))).toBe(false);
    expect(isTabPress(pressOn(true, { button: 1 }))).toBe(false);
  });
});

describe('orders', () => {
  const order = (id, number, status = 'Pending', visitId = 'visit-1') => ({ id, number, status, visitId });

  it('adds a new order, newest first', () => {
    expect(mergeOrder([order('a', 1)], order('b', 2), 'visit-1').map((o) => o.id)).toEqual(['b', 'a']);
  });

  it('replaces the order with the same id', () => {
    expect(mergeOrder([order('a', 1)], order('a', 1, 'Preparing'), 'visit-1')).toEqual([order('a', 1, 'Preparing')]);
  });

  it('ignores an order from another visit', () => {
    const orders = [order('a', 1)];
    expect(mergeOrder(orders, order('b', 2, 'Pending', 'old'), 'visit-1')).toBe(orders);
  });

  it('never moves an order back when an old event replays', () => {
    const orders = [order('a', 1, 'Completed')];
    expect(mergeOrder(orders, order('a', 1, 'Preparing'), 'visit-1')).toBe(orders);
  });

  it('filters and sorts a fresh read', () => {
    const read = [order('a', 1), order('c', 3), order('b', 2, 'Pending', 'old')];
    expect(ordersForVisit(read, 'visit-1').map((o) => o.id)).toEqual(['c', 'a']);
  });

  it('words a refused cancel', () => {
    expect(cancelRefusedMessage(15, 'Preparing')).toBe("Order #15 is already being prepared, so it can't be cancelled.");
    expect(cancelRefusedMessage(15, 'Completed')).toBe("Order #15 is already completed, so it can't be cancelled.");
  });
});
