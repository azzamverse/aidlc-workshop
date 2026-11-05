import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_CATEGORIES, TABLE_COUNT } from './seed-data.js';

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

/** Opens the database file, creating its folder, schema and seed as needed. */
export function openDatabase(dbFile) {
  let db;
  try {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    db = new DatabaseSync(dbFile);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA);
    seedIfEmpty(db);
    return db;
  } catch (error) {
    if (db?.isOpen) db.close();
    throw new Error(`Could not prepare the database at ${dbFile}: ${error.message}`, { cause: error });
  }
}
