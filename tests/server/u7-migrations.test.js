import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrations } from '../../server/features/u7.js';
import { createTestContext } from './context-helper.js';

const VISIT_ID = 'visit-1';

describe('the spins table', () => {
  let context;
  const insertSpin = (overrides = {}) => {
    const spin = { id: 'spin-1', visit: VISIT_ID, question: 'tab', seats: 4, seat: 2, ...overrides };
    context.db
      .prepare('INSERT INTO spins (id, visit_id, question, seats, result_seat, started_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(spin.id, spin.visit, spin.question, spin.seats, spin.seat, '2026-11-10T10:00:00.000Z');
  };

  beforeEach(() => {
    context = createTestContext();
    context.db
      .prepare("INSERT INTO visits (id, table_id, status, started_at) VALUES (?, 1, 'Open', '2026-11-10T09:00:00.000Z')")
      .run(VISIT_ID);
  });

  afterEach(() => context.cleanup());

  it('is added and recorded once', () => {
    const recorded = context.db.prepare("SELECT id FROM schema_upgrades WHERE id = 'u7-spins'").all();
    expect(recorded).toHaveLength(1);
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM spins').get().count).toBe(0);
  });

  it('adds only a new table: its steps create and never alter or drop', () => {
    const sql = migrations().map((step) => step.sql).join(' ');
    expect(sql).toMatch(/CREATE TABLE spins/);
    expect(sql).not.toMatch(/\b(ALTER|DROP|DELETE|UPDATE)\b/i);
  });

  it('holds no name or payment column', () => {
    const columns = context.db.prepare('PRAGMA table_info(spins)').all().map((column) => column.name);
    expect(columns.sort()).toEqual(['id', 'question', 'result_seat', 'seats', 'started_at', 'visit_id']);
  });

  it('stores a valid spin', () => {
    insertSpin();
    expect(context.db.prepare('SELECT result_seat AS seat FROM spins').get().seat).toBe(2);
  });

  it.each([
    ['too few seats', { seats: 1, seat: 1 }],
    ['too many seats', { seats: 9, seat: 1 }],
    ['a seat past the last', { seats: 4, seat: 5 }],
    ['seat zero', { seat: 0 }],
    ['an unknown question', { question: 'dishes' }],
    ['an unknown visit', { visit: 'nope' }],
  ])('refuses %s', (_name, overrides) => {
    expect(() => insertSpin(overrides)).toThrow();
  });
});
