import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLiveRepo } from '../../server/live/repo.js';
import { createMenuRepo } from '../../server/menu/repo.js';
import { createOrderingRepo } from '../../server/ordering/repo.js';
import { createTablesRepo } from '../../server/tables/repo.js';
import { createTempDatabase } from './helpers.js';

const INSTANT = '2026-01-01T10:00:00.000Z';

describe('repositories', () => {
  let temp;
  let db;
  let menu;
  let tables;
  let ordering;
  let live;

  beforeEach(() => {
    temp = createTempDatabase();
    db = temp.open();
    menu = createMenuRepo(db);
    tables = createTablesRepo(db);
    ordering = createOrderingRepo(db);
    live = createLiveRepo(db);
  });

  afterEach(() => {
    db.close();
    temp.cleanup();
  });

  function insertOrder(id, number, visitId, lines = [{ id: `${id}-l1`, itemId: 'coffee', name: 'Coffee', unitPriceCents: 250, quantity: 2 }]) {
    ordering.insertOrder({ id, number, visitId, placementKey: `key-${id}`, placedAt: INSTANT, lines });
  }

  function openVisit(id = 'visit-1', tableId = 5) {
    tables.insertVisit({ id, tableId, startedAt: INSTANT });
    return id;
  }

  describe('menu', () => {
    it('lists categories and items in position order with all five fields', () => {
      const categories = menu.listCategoriesWithItems();
      expect(categories.map((category) => category.name)).toEqual(['Starters', 'Mains', 'Desserts', 'Drinks']);
      expect(categories[0].items.map((item) => item.name)).toEqual(['Garlic Bread', 'Tomato Soup', 'Caesar Salad']);
      expect(categories[0].items[0]).toEqual({
        id: 'garlic-bread',
        name: 'Garlic Bread',
        description: 'Toasted sourdough with garlic butter and parsley.',
        priceCents: 450,
        image: '🥖',
        soldOut: false,
      });
    });

    it('sets the sold-out mark and reports an unknown item', () => {
      expect(menu.setSoldOut('coffee', true)).toBe(true);
      expect(menu.findItem('coffee').soldOut).toBe(true);
      expect(menu.setSoldOut('nope', true)).toBe(false);
      expect(menu.findItem('nope')).toBeNull();
    });
  });

  describe('tables', () => {
    it('finds tables and reports a missing one', () => {
      expect(tables.listTables()).toHaveLength(10);
      expect(tables.findTable(5)).toEqual({ id: 5, label: 'Table 5' });
      expect(tables.findTable(11)).toBeNull();
    });

    it('opens and closes a visit, and closing twice reports false', () => {
      openVisit();
      expect(tables.findOpenVisit(5).id).toBe('visit-1');
      expect(tables.closeVisit('visit-1', INSTANT)).toBe(true);
      expect(tables.findOpenVisit(5)).toBeNull();
      expect(tables.findVisit('visit-1')).toMatchObject({ status: 'Closed', closedAt: INSTANT });
      expect(tables.closeVisit('visit-1', INSTANT)).toBe(false);
    });
  });

  describe('ordering', () => {
    it('stores an order and works out tableId and totalCents', () => {
      openVisit();
      insertOrder('o1', 1, 'visit-1');
      expect(ordering.findById('o1')).toEqual({
        id: 'o1',
        number: 1,
        tableId: 5,
        visitId: 'visit-1',
        status: 'Pending',
        placedAt: INSTANT,
        totalCents: 500,
        lines: [{ name: 'Coffee', quantity: 2, unitPriceCents: 250 }],
      });
      expect(ordering.findByPlacementKey('key-o1').id).toBe('o1');
    });

    it('numbers from 1 and lists a visit newest first', () => {
      openVisit();
      expect(ordering.nextNumber()).toBe(1);
      insertOrder('o1', 1, 'visit-1');
      insertOrder('o2', 2, 'visit-1');
      expect(ordering.nextNumber()).toBe(3);
      expect(ordering.listByVisit('visit-1').map((order) => order.number)).toEqual([2, 1]);
    });

    it('refuses a repeated order number or placement key', () => {
      openVisit();
      insertOrder('o1', 1, 'visit-1');
      expect(() => insertOrder('o2', 1, 'visit-1')).toThrow(/UNIQUE/);
      expect(() =>
        ordering.insertOrder({ id: 'o3', number: 3, visitId: 'visit-1', placementKey: 'key-o1', placedAt: INSTANT, lines: [] }),
      ).toThrow(/UNIQUE/);
    });

    it('changes status only from the expected status', () => {
      openVisit();
      insertOrder('o1', 1, 'visit-1');
      expect(ordering.updateStatusIfCurrent('o1', 'Preparing', 'Completed')).toBe(false);
      expect(ordering.updateStatusIfCurrent('o1', 'Pending', 'Preparing')).toBe(true);
      expect(ordering.findById('o1').status).toBe('Preparing');
    });

    it('returns null for an unknown order', () => {
      expect(ordering.findById('nope')).toBeNull();
      expect(ordering.findByPlacementKey('nope')).toBeNull();
    });
  });

  describe('live events', () => {
    const add = (createdAt = INSTANT, tableId = 5) =>
      live.insert({ type: 'order.placed', tableId, payload: { a: 1 }, createdAt });

    it('numbers events upward and lists those after a sequence', () => {
      expect(live.latestSequence()).toBe(0);
      expect(add().sequence).toBe(1);
      expect(add().sequence).toBe(2);
      expect(live.listAfter(1).map((event) => event.sequence)).toEqual([2]);
      expect(live.listAfter(1)[0]).toMatchObject({ type: 'order.placed', tableId: 5, payload: { a: 1 } });
    });

    it('prunes old events but keeps counting from the highest number', () => {
      add('2026-01-01T08:00:00.000Z');
      add('2026-01-01T12:00:00.000Z');
      expect(live.deleteOlderThan(INSTANT)).toBe(1);
      expect(live.findFirstAfter(0).sequence).toBe(2);
      live.deleteOlderThan('2027-01-01T00:00:00.000Z');
      expect(live.latestSequence()).toBe(2);
      expect(add().sequence).toBe(3);
    });
  });
});
