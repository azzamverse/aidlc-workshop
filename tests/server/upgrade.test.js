import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, runUpgrades, U5_UPGRADE_STEPS } from '../../server/platform/db.js';
import { PROJECT_ROOT } from '../../server/platform/settings.js';
import { SEED_CATEGORIES, SEED_DETAILS } from '../../server/platform/seed-data.js';
import { createTempDatabase, createTestLog } from './helpers.js';

const V2_TABLES = ['options', 'option_groups', 'item_moods', 'item_allergens', 'schema_upgrades'];
const V1_TABLES = ['tables', 'menu_categories', 'menu_items', 'visits', 'orders', 'order_lines', 'live_events'];
const REAL_V1_DATABASE = path.join(PROJECT_ROOT, 'data', 'table-order.db');

const rowsOf = (db, table) => db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all();
const countOf = (db, table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
const snapshot = (db, tables) => Object.fromEntries(tables.map((table) => [table, rowsOf(db, table)]));

/** Takes the database back to what v1 left: its tables, and one real order. */
function makeV1Shaped(dbFile) {
  const db = new DatabaseSync(dbFile);
  V2_TABLES.forEach((table) => db.exec(`DROP TABLE ${table}`));
  db.prepare("INSERT INTO visits (id, table_id, started_at) VALUES ('v1-visit', 3, '2026-11-01T10:00:00.000Z')").run();
  db.prepare("INSERT INTO orders (id, number, visit_id, placement_key, placed_at) VALUES ('v1-order', 1, 'v1-visit', 'k', '2026-11-01T10:01:00.000Z')").run();
  db.prepare("INSERT INTO order_lines (id, order_id, item_id, name, unit_price_cents, quantity, position) VALUES ('v1-line', 'v1-order', 'coffee', 'Coffee', 250, 2, 0)").run();
  db.prepare("UPDATE menu_items SET sold_out = 1 WHERE id = 'lemonade'").run();
  return db;
}

describe('database upgrade', () => {
  let temp;

  beforeEach(() => {
    temp = createTempDatabase();
  });

  afterEach(() => temp.cleanup());

  it('an empty database gets v1 seed, every step recorded, and details', () => {
    const db = temp.open();
    expect(countOf(db, 'tables')).toBe(10);
    expect(countOf(db, 'menu_categories')).toBe(4);
    expect(countOf(db, 'menu_items')).toBe(12);
    expect(rowsOf(db, 'schema_upgrades').map((row) => row.id).sort()).toEqual(U5_UPGRADE_STEPS.map((step) => step.id).sort());
    expect(countOf(db, 'item_moods')).toBe(12);
    db.close();
  });

  it('a v1 database keeps every row and gains the details', () => {
    temp.open().close();
    const v1 = makeV1Shaped(temp.dbFile);
    const before = snapshot(v1, V1_TABLES);
    v1.close();

    const db = temp.open();
    expect(snapshot(db, V1_TABLES)).toEqual(before);
    expect(countOf(db, 'item_moods')).toBe(12);
    expect(countOf(db, 'schema_upgrades')).toBe(U5_UPGRADE_STEPS.length);
    db.close();
  });

  it.runIf(fs.existsSync(REAL_V1_DATABASE))('a copy of the real database from the v1 run upgrades and keeps its rows', () => {
    fs.mkdirSync(path.dirname(temp.dbFile), { recursive: true });
    fs.copyFileSync(REAL_V1_DATABASE, temp.dbFile);
    const copy = new DatabaseSync(temp.dbFile);
    const before = snapshot(copy, V1_TABLES);
    copy.close();

    const db = temp.open();
    expect(snapshot(db, V1_TABLES)).toEqual(before);
    expect(countOf(db, 'item_moods')).toBe(12);
    db.close();
  });

  it('a second start changes nothing', () => {
    temp.open().close();
    const first = new DatabaseSync(temp.dbFile);
    const before = snapshot(first, [...V1_TABLES, ...V2_TABLES]);
    first.close();

    const db = temp.open();
    expect(snapshot(db, [...V1_TABLES, ...V2_TABLES])).toEqual(before);
    db.close();
  });

  it('never overwrites a detail already there', () => {
    temp.open().close();
    const edited = new DatabaseSync(temp.dbFile);
    edited.exec("UPDATE item_moods SET mood = 'sweet' WHERE item_id = 'coffee'");
    edited.exec("DELETE FROM item_allergens WHERE item_id = 'apple-pie' AND allergen = 'nuts'");
    edited.close();

    const db = temp.open();
    expect(db.prepare("SELECT mood FROM item_moods WHERE item_id = 'coffee'").get().mood).toBe('sweet');
    expect(db.prepare("SELECT 1 FROM item_allergens WHERE item_id = 'apple-pie' AND allergen = 'nuts'").get()).toBeUndefined();
    db.close();
  });

  describe('the step runner', () => {
    let db;

    beforeEach(() => {
      db = temp.open();
    });

    afterEach(() => db.close());

    it('runs steps in the order given, each once', () => {
      const steps = [
        { id: 'test-one', sql: 'CREATE TABLE one (id INTEGER)' },
        { id: 'test-two', sql: 'CREATE TABLE two (id INTEGER)' },
      ];
      runUpgrades(db, steps, createTestLog());
      runUpgrades(db, steps, createTestLog());
      const ids = db.prepare("SELECT id FROM schema_upgrades WHERE id LIKE 'test-%' ORDER BY rowid").all().map((row) => row.id);
      expect(ids).toEqual(['test-one', 'test-two']);
    });

    it('a failing step stops the run with its id logged, and earlier steps stay', () => {
      const log = createTestLog();
      const steps = [
        { id: 'test-good', sql: 'CREATE TABLE good (id INTEGER)' },
        { id: 'test-bad', sql: 'CREATE TABLE half (id INTEGER); THIS IS NOT SQL' },
        { id: 'test-never', sql: 'CREATE TABLE never (id INTEGER)' },
      ];
      expect(() => runUpgrades(db, steps, log)).toThrow(/test-bad/);
      expect(log.errors[0].message).toContain('test-bad');
      const tableExists = (name) => db.prepare('SELECT 1 FROM sqlite_master WHERE name = ?').get(name) !== undefined;
      expect(tableExists('good')).toBe(true);
      expect(tableExists('half')).toBe(false);
      expect(tableExists('never')).toBe(false);
      expect(db.prepare("SELECT 1 FROM schema_upgrades WHERE id = 'test-bad'").get()).toBeUndefined();
    });
  });
});

describe('seed details', () => {
  const details = Object.values(SEED_DETAILS);
  const dairyNames = Object.entries(SEED_DETAILS).filter(([, one]) => one.allergens.includes('dairy')).map(([name]) => name);

  it('covers exactly the 12 seeded items, by name', () => {
    const seededNames = SEED_CATEGORIES.flatMap((category) => category.items.map((item) => item[1]));
    expect(Object.keys(SEED_DETAILS).sort()).toEqual([...seededNames].sort());
  });

  it('has at least one item for each allergen and each mood', () => {
    expect([...new Set(details.flatMap((one) => one.allergens))].sort()).toEqual(
      ['dairy', 'eggs', 'fish', 'gluten', 'nuts', 'peanuts', 'shellfish', 'soy'],
    );
    expect([...new Set(details.map((one) => one.mood))].sort()).toEqual(['hearty', 'light', 'sweet']);
  });

  it('gives every pick-one group exactly one default, and pick-any groups none', () => {
    for (const group of details.flatMap((one) => one.groups)) {
      const defaults = group.options.filter((option) => option[2]);
      expect(defaults).toHaveLength(group.kind === 'one' ? 1 : 0);
    }
  });

  it('prices every option in whole cents of zero or more, and the defaults at zero', () => {
    for (const [, cents, isDefault] of details.flatMap((one) => one.groups.flatMap((group) => group.options))) {
      expect(Number.isInteger(cents) && cents >= 0).toBe(true);
      if (isDefault) expect(cents).toBe(0);
    }
  });

  it('offers extra cheese only on dairy items', () => {
    const withCheese = Object.entries(SEED_DETAILS)
      .filter(([, one]) => one.groups.some((group) => group.options.some(([name]) => name === 'Extra cheese')))
      .map(([name]) => name);
    expect(withCheese.length).toBeGreaterThan(0);
    expect(withCheese.every((name) => dairyNames.includes(name))).toBe(true);
  });

  it('defaults spice to Medium and size to Regular', () => {
    const defaultOf = (groupName) => [...new Set(details.flatMap((one) => one.groups)
      .filter((group) => group.name === groupName)
      .map((group) => group.options.find((option) => option[2])[0]))];
    expect(defaultOf('Spice')).toEqual(['Medium']);
    expect(defaultOf('Size')).toEqual(['Regular']);
  });
});

it('openDatabase runs feature steps after U5\'s', () => {
  const temp = createTempDatabase();
  try {
    const db = openDatabase(temp.dbFile, { featureSteps: [{ id: 'u6-test', sql: 'CREATE TABLE u6_table (id INTEGER)' }], log: createTestLog() });
    const ids = db.prepare('SELECT id FROM schema_upgrades ORDER BY rowid').all().map((row) => row.id);
    expect(ids.at(-1)).toBe('u6-test');
    expect(ids).toHaveLength(U5_UPGRADE_STEPS.length + 1);
    db.close();
  } finally {
    temp.cleanup();
  }
});
