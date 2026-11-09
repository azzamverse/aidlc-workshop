import { describe, expect, it } from 'vitest';
import {
  applyRead,
  clearTables,
  isNew,
  mergeOrder,
  moveOffered,
  moveRefusedMessage,
} from '../../client/src/screens/kitchen/boardLogic.js';

const order = (id, number, status = 'Pending', tableId = 1) => ({ id, number, status, tableId });
const table = (id, orders = []) => ({ id, orders });

describe('merging a live order', () => {
  it('adds to the right table, newest first', () => {
    const result = mergeOrder([table(1, [order('a', 1)]), table(2)], order('b', 2));
    expect(result[0].orders.map((o) => o.id)).toEqual(['b', 'a']);
    expect(result[1].orders).toEqual([]);
  });

  it('replaces the order with the same id', () => {
    expect(mergeOrder([table(1, [order('a', 1)])], order('a', 1, 'Preparing'))[0].orders).toEqual([order('a', 1, 'Preparing')]);
  });

  it('never moves an order back on a replay', () => {
    const tables = [table(1, [order('a', 1, 'Completed')])];
    expect(mergeOrder(tables, order('a', 1, 'Preparing'))[0].orders[0].status).toBe('Completed');
    expect(mergeOrder(tables, order('a', 1, 'Pending'))[0].orders[0].status).toBe('Completed');
  });

  it('ignores a table the board does not list', () => {
    expect(mergeOrder([table(1)], order('a', 1, 'Pending', 9))).toEqual([table(1)]);
  });
});

describe('a read of the board', () => {
  it('keeps a change newer than the read', () => {
    const read = [table(1, [order('a', 1, 'Pending')])];
    expect(applyRead(read, [order('a', 1, 'Preparing'), order('b', 2)])[0].orders.map((o) => o.status)).toEqual(['Pending', 'Preparing']);
  });

  it('stands as it is when nothing changed, and does not lose a later status it holds', () => {
    const read = [table(1, [order('a', 1, 'Completed')])];
    expect(applyRead(read, [])).toEqual(read);
    expect(applyRead(read, [order('a', 1, 'Preparing')])[0].orders[0].status).toBe('Completed');
  });
});

describe('a closed table', () => {
  it('clears only the tables named', () => {
    const result = clearTables([table(1, [order('a', 1)]), table(2, [order('b', 2, 'Pending', 2)])], [1]);
    expect(result[0].orders).toEqual([]);
    expect(result[1].orders).toHaveLength(1);
  });
});

describe('highlight and moves', () => {
  it.each([
    ['Pending', true],
    ['Preparing', false],
    ['Completed', false],
    ['Cancelled', false],
  ])('%s highlighted: %s', (status, expected) => {
    expect(isNew({ status })).toBe(expected);
  });

  it('offers only one step forward', () => {
    expect(moveOffered('Pending')).toEqual({ to: 'Preparing', label: 'Start preparing' });
    expect(moveOffered('Preparing')).toEqual({ to: 'Completed', label: 'Mark completed' });
    expect(moveOffered('Completed')).toBeNull();
    expect(moveOffered('Cancelled')).toBeNull();
  });

  it('words a refusal', () => {
    expect(moveRefusedMessage(15, 'Cancelled')).toBe("Order #15 was just cancelled by the diner, so it can't be moved on.");
    expect(moveRefusedMessage(15, 'Completed')).toBe("Order #15 is already completed, so it can't be moved on.");
  });
});
