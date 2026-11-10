import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrations } from '../../server/features/u6.js';
import { openDatabase } from '../../server/platform/db.js';
import { createTempDatabase, createTestLog } from './helpers.js';

const V1_TABLES = ['tables', 'menu_categories', 'menu_items', 'visits', 'orders', 'order_lines', 'live_events'];
const openWithU6 = (temp) => openDatabase(temp.dbFile, { featureSteps: migrations(), log: createTestLog() });
const snapshot = (db, tables) => Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]));
const exists = (db, name) => Boolean(db.prepare('SELECT 1 FROM sqlite_master WHERE name = ?').get(name));

describe('U6 database steps', () => {
  let temp;

  beforeEach(() => {
    temp = createTempDatabase();
  });

  afterEach(() => temp.cleanup());

  it('adds both tables and the guard to a database without them, keeping its data', () => {
    temp.open().close();
    const v1 = new DatabaseSync(temp.dbFile);
    v1.exec("INSERT INTO visits (id, table_id, started_at) VALUES ('old-visit', 3, '2026-11-01T10:00:00.000Z')");
    v1.exec("INSERT INTO orders (id, number, visit_id, placement_key, placed_at) VALUES ('old-order', 1, 'old-visit', 'k', '2026-11-01T10:01:00.000Z')");
    v1.exec("INSERT INTO order_lines (id, order_id, item_id, name, unit_price_cents, quantity, position) VALUES ('old-line', 'old-order', 'coffee', 'Coffee', 250, 2, 0)");
    const before = snapshot(v1, V1_TABLES);
    v1.close();

    const db = openWithU6(temp);
    expect(exists(db, 'order_line_options')).toBe(true);
    expect(exists(db, 'table_requests')).toBe(true);
    expect(exists(db, 'one_waiting_request_per_visit_and_kind')).toBe(true);
    expect(snapshot(db, V1_TABLES)).toEqual(before);
    db.close();
  });

  it('a second start changes nothing', () => {
    openWithU6(temp).close();
    const first = new DatabaseSync(temp.dbFile);
    const before = snapshot(first, [...V1_TABLES, 'order_line_options', 'table_requests', 'schema_upgrades']);
    first.close();

    const db = openWithU6(temp);
    expect(snapshot(db, [...V1_TABLES, 'order_line_options', 'table_requests', 'schema_upgrades'])).toEqual(before);
    db.close();
  });

  describe('the waiting-request guard', () => {
    let db;
    const insertRequest = (id, visitId, kind, status) =>
      db.prepare("INSERT INTO table_requests (id, visit_id, kind, status, created_at) VALUES (?, ?, ?, ?, '2026-11-01T10:00:00.000Z')").run(id, visitId, kind, status);

    beforeEach(() => {
      db = openWithU6(temp);
      db.exec("INSERT INTO visits (id, table_id, started_at) VALUES ('visit', 3, '2026-11-01T10:00:00.000Z')");
    });

    afterEach(() => db.close());

    it('refuses a second waiting request of one kind', () => {
      insertRequest('a', 'visit', 'waiter', 'waiting');
      expect(() => insertRequest('b', 'visit', 'waiter', 'waiting')).toThrow(/UNIQUE/);
    });

    it('allows waiter and bill to wait together, and a new request after a response', () => {
      insertRequest('a', 'visit', 'waiter', 'responded');
      insertRequest('b', 'visit', 'waiter', 'waiting');
      insertRequest('c', 'visit', 'bill', 'waiting');
      expect(db.prepare('SELECT COUNT(*) AS count FROM table_requests').get().count).toBe(3);
    });

    it('refuses a kind the table does not allow', () => {
      expect(() => insertRequest('a', 'visit', 'dessert', 'waiting')).toThrow(/CHECK/);
    });
  });
});
