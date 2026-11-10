import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { logger } from './logger.js';
import { SEED_CATEGORIES, SEED_DETAILS, TABLE_COUNT } from './seed-data.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES menu_categories(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 1),
    image TEXT NOT NULL,
    sold_out INTEGER NOT NULL DEFAULT 0 CHECK (sold_out IN (0, 1)),
    position INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND ${TABLE_COUNT}),
    label TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES tables(id),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    started_at TEXT NOT NULL,
    closed_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS one_open_visit_per_table
    ON visits(table_id) WHERE status = 'Open';
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    visit_id TEXT NOT NULL REFERENCES visits(id),
    status TEXT NOT NULL DEFAULT 'Pending'
      CHECK (status IN ('Pending', 'Preparing', 'Completed', 'Cancelled')),
    placement_key TEXT NOT NULL UNIQUE,
    placed_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_by_visit ON orders(visit_id);
  CREATE TABLE IF NOT EXISTS order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    item_id TEXT NOT NULL REFERENCES menu_items(id),
    name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS lines_by_order ON order_lines(order_id);
  CREATE TABLE IF NOT EXISTS live_events (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    table_id INTEGER,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

/** U5's add-only steps (BR3.1). U6's and U7's come from their feature modules. */
export const U5_UPGRADE_STEPS = [
  {
    id: 'u5-item-allergens',
    sql: `CREATE TABLE item_allergens (
      item_id TEXT NOT NULL REFERENCES menu_items(id),
      allergen TEXT NOT NULL CHECK (allergen IN ('gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'fish', 'shellfish')),
      PRIMARY KEY (item_id, allergen)
    )`,
  },
  {
    id: 'u5-item-moods',
    sql: `CREATE TABLE item_moods (
      item_id TEXT PRIMARY KEY REFERENCES menu_items(id),
      mood TEXT NOT NULL CHECK (mood IN ('light', 'hearty', 'sweet'))
    )`,
  },
  {
    id: 'u5-option-groups',
    sql: `CREATE TABLE option_groups (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES menu_items(id),
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('one', 'any')),
      position INTEGER NOT NULL CHECK (position >= 0)
    )`,
  },
  {
    id: 'u5-options',
    sql: `CREATE TABLE options (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES option_groups(id),
      name TEXT NOT NULL,
      price_delta_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      position INTEGER NOT NULL CHECK (position >= 0)
    )`,
  },
];

function runStep(db, step) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(step.sql);
    db.prepare('INSERT INTO schema_upgrades (id, applied_at) VALUES (?, ?)').run(step.id, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Applies each unrecorded step once, in its own transaction, in the order given.
 * A failing step stops the start with its id logged; earlier steps stay (BR3.1).
 */
export function runUpgrades(db, steps, log = logger) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_upgrades (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const isRecorded = db.prepare('SELECT 1 FROM schema_upgrades WHERE id = ?');
  for (const step of steps) {
    if (isRecorded.get(step.id)) continue;
    try {
      runStep(db, step);
    } catch (error) {
      log.error(`Database upgrade step ${step.id} failed`, error);
      throw new Error(`Database upgrade step ${step.id} failed: ${error.message}`, { cause: error });
    }
  }
}

function insertItemDetails(db, itemId, details) {
  const addAllergen = db.prepare('INSERT INTO item_allergens (item_id, allergen) VALUES (?, ?)');
  const addGroup = db.prepare('INSERT INTO option_groups (id, item_id, name, kind, position) VALUES (?, ?, ?, ?, ?)');
  const addOption = db.prepare(`
    INSERT INTO options (id, group_id, name, price_delta_cents, is_default, position) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const hasRows = (table) => db.prepare(`SELECT 1 FROM ${table} WHERE item_id = ? LIMIT 1`).get(itemId);

  if (!hasRows('item_allergens')) details.allergens.forEach((allergen) => addAllergen.run(itemId, allergen));
  db.prepare('INSERT OR IGNORE INTO item_moods (item_id, mood) VALUES (?, ?)').run(itemId, details.mood);
  if (hasRows('option_groups')) return;
  details.groups.forEach((group, groupPosition) => {
    const groupId = `${itemId}-${group.name.toLowerCase()}`;
    addGroup.run(groupId, itemId, group.name, group.kind, groupPosition);
    group.options.forEach(([name, priceDeltaCents, isDefault], optionPosition) => {
      const optionId = `${groupId}-${name.toLowerCase().replaceAll(' ', '-')}`;
      addOption.run(optionId, groupId, name, priceDeltaCents, isDefault ? 1 : 0, optionPosition);
    });
  });
}

/** Adds v2's details by item name, never changing an item or existing details (BR3.2). */
export function addMissingDetails(db, detailsByName = SEED_DETAILS) {
  const findItem = db.prepare('SELECT id FROM menu_items WHERE name = ?');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [name, details] of Object.entries(detailsByName)) {
      const item = findItem.get(name);
      if (item) insertItemDetails(db, item.id, details);
    }
    db.exec('COMMIT');
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}

function insertSeedRows(db) {
  const addTable = db.prepare('INSERT INTO tables (id, label) VALUES (?, ?)');
  const addCategory = db.prepare('INSERT INTO menu_categories (id, name, position) VALUES (?, ?, ?)');
  const addItem = db.prepare(`
    INSERT INTO menu_items (id, category_id, name, description, price_cents, image, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (let id = 1; id <= TABLE_COUNT; id += 1) addTable.run(id, `Table ${id}`);
  SEED_CATEGORIES.forEach((category, categoryPosition) => {
    addCategory.run(category.id, category.name, categoryPosition);
    category.items.forEach((item, itemPosition) => {
      const [id, name, description, priceCents, image] = item;
      addItem.run(id, category.id, name, description, priceCents, image, itemPosition);
    });
  });
}

/** Seeds an empty database as one transaction: all the rows or none (BR6.1, BR7.7). */
export function seedIfEmpty(db, insertRows = insertSeedRows) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM tables').get();
  if (count > 0) return false;
  db.exec('BEGIN IMMEDIATE');
  try {
    insertRows(db);
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Opens the database file, creating its folder, schema and seed as needed, then
 * upgrades it: U5's steps first, then `featureSteps` (U6's, then U7's).
 */
export function openDatabase(dbFile, { featureSteps = [], log = logger } = {}) {
  let db;
  try {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    db = new DatabaseSync(dbFile);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA);
    runUpgrades(db, [...U5_UPGRADE_STEPS, ...featureSteps], log);
    seedIfEmpty(db);
    addMissingDetails(db);
    return db;
  } catch (error) {
    if (db?.isOpen) db.close();
    throw new Error(`Could not prepare the database at ${dbFile}: ${error.message}`, { cause: error });
  }
}
