import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { seedIfEmpty, openDatabase } from '../../server/platform/db.js';
import { AppError, toErrorBody } from '../../server/platform/errors.js';
import { PROJECT_ROOT, readSettings } from '../../server/platform/settings.js';
import { createTransactions } from '../../server/platform/transaction.js';
import { createTempDatabase, createTestLog } from './helpers.js';

const count = (db, table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;

describe('database', () => {
  let temp;
  let db;

  beforeEach(() => {
    temp = createTempDatabase();
    db = temp.open();
  });

  afterEach(() => {
    if (db.isOpen) db.close();
    temp.cleanup();
  });

  it('seeds 10 tables, 4 categories and 12 items on first run', () => {
    expect(count(db, 'tables')).toBe(10);
    expect(count(db, 'menu_categories')).toBe(4);
    expect(count(db, 'menu_items')).toBe(12);
  });

  it('does not seed twice and keeps changed data across a reopen', () => {
    db.prepare("UPDATE menu_items SET sold_out = 1 WHERE id = 'coffee'").run();
    db.close();
    db = temp.open();
    expect(count(db, 'menu_items')).toBe(12);
    expect(db.prepare("SELECT sold_out FROM menu_items WHERE id = 'coffee'").get().sold_out).toBe(1);
  });

  it('stores seeded prices as whole cents matching the mockups', () => {
    const coffee = db.prepare("SELECT price_cents, image FROM menu_items WHERE id = 'coffee'").get();
    expect(coffee).toEqual({ price_cents: 250, image: '☕' });
  });

  it('refuses a second open visit for the same table', () => {
    const addVisit = db.prepare(
      "INSERT INTO visits (id, table_id, started_at) VALUES (?, 1, '2026-01-01T00:00:00.000Z')",
    );
    addVisit.run('first');
    expect(() => addVisit.run('second')).toThrow(/UNIQUE/);
  });

  it('rolls back a seed that fails part way, leaving no rows', () => {
    db.exec('DELETE FROM tables');
    expect(() =>
      seedIfEmpty(db, (database) => {
        database.prepare("INSERT INTO tables (id, label) VALUES (1, 'Table 1')").run();
        throw new Error('disk full');
      }),
    ).toThrow('disk full');
    expect(count(db, 'tables')).toBe(0);
  });

  it('fails with a clear message when the database cannot be opened', () => {
    // A path whose parent is an existing file can never be created.
    expect(() => openDatabase(path.join(temp.dbFile, 'child', 'x.db'))).toThrow(
      /Could not prepare the database at/,
    );
  });
});

describe('withTransaction', () => {
  let temp;
  let db;
  let log;
  let transactions;
  const tableLabel = () => db.prepare('SELECT label FROM tables WHERE id = 1').get().label;
  const rename = (label) => db.prepare('UPDATE tables SET label = ? WHERE id = 1').run(label);

  beforeEach(() => {
    temp = createTempDatabase();
    db = temp.open();
    log = createTestLog();
    transactions = createTransactions(db, log);
  });

  afterEach(() => {
    db.close();
    temp.cleanup();
  });

  it('commits work, returns its result, then runs after-commit steps', () => {
    const seenDuringStep = [];
    const result = transactions.withTransaction(() => {
      rename('Changed');
      transactions.afterCommit(() => seenDuringStep.push(db.isTransaction));
      expect(seenDuringStep).toEqual([]);
      return 'done';
    });
    expect(result).toBe('done');
    expect(tableLabel()).toBe('Changed');
    expect(seenDuringStep).toEqual([false]);
  });

  it('rolls back on error and drops the after-commit steps', () => {
    let ran = false;
    expect(() =>
      transactions.withTransaction(() => {
        rename('Changed');
        transactions.afterCommit(() => {
          ran = true;
        });
        throw new Error('stop');
      }),
    ).toThrow('stop');
    expect(tableLabel()).toBe('Table 1');
    expect(ran).toBe(false);
  });

  it('joins an outer transaction, so an inner failure undoes everything', () => {
    expect(() =>
      transactions.withTransaction(() => {
        rename('Outer');
        transactions.withTransaction(() => {
          throw new Error('inner');
        });
      }),
    ).toThrow('inner');
    expect(tableLabel()).toBe('Table 1');
  });

  it('refuses asynchronous work and rolls it back', () => {
    expect(() =>
      transactions.withTransaction(() => {
        rename('Changed');
        return Promise.resolve();
      }),
    ).toThrow(/synchronous/);
    expect(tableLabel()).toBe('Table 1');
  });

  it('logs a failing after-commit step and keeps the commit', () => {
    transactions.withTransaction(() => {
      rename('Changed');
      transactions.afterCommit(() => {
        throw new Error('send failed');
      });
    });
    expect(tableLabel()).toBe('Changed');
    expect(log.errors).toHaveLength(1);
  });

  it('refuses an after-commit step outside a transaction', () => {
    expect(() => transactions.afterCommit(() => {})).toThrow(/open transaction/);
  });
});

describe('settings', () => {
  it('uses the defaults when nothing is set', () => {
    const settings = readSettings({});
    expect(settings.port).toBe(3000);
    expect(settings.e2ePort).toBe(3100);
    expect(settings.dbFile).toBe(path.join(PROJECT_ROOT, 'data', 'table-order.db'));
    expect(settings.isTestMode).toBe(false);
  });

  it('reads PORT, E2E_PORT, DB_FILE and NODE_ENV from the environment', () => {
    const settings = readSettings({ PORT: '4000', E2E_PORT: '4100', DB_FILE: 'a/b.db', NODE_ENV: 'test' });
    expect(settings.port).toBe(4000);
    expect(settings.e2ePort).toBe(4100);
    expect(settings.dbFile).toBe(path.resolve('a/b.db'));
    expect(settings.isTestMode).toBe(true);
  });

  it.each(['abc', '0', '70000', '30.5'])('refuses the bad PORT %s, naming the setting', (port) => {
    expect(() => readSettings({ PORT: port })).toThrow(/Invalid setting PORT/);
  });
});

describe('error shape', () => {
  it('puts code, message and details in one error object', () => {
    const error = new AppError(409, 'ITEM_SOLD_OUT', 'Sold out.', { soldOutItemIds: ['coffee'] });
    expect(toErrorBody(error)).toEqual({
      error: { code: 'ITEM_SOLD_OUT', message: 'Sold out.', soldOutItemIds: ['coffee'] },
    });
  });
});
