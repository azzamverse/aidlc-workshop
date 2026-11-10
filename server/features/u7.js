import { randomInt, randomUUID } from 'node:crypto';
import { AppError } from '../platform/errors.js';

/** BR11.4: how long a spin runs, and so how long it blocks the next one. */
export const SPIN_MS = 5000;
const QUESTIONS = ['tab', 'dessert'];
const MIN_SEATS = 2;
const MAX_SEATS = 8;

const invalidSpin = () => new AppError(400, 'INVALID_SPIN', 'Choose 2 to 8 seats and one of the two questions.');
const noOpenVisit = () => new AppError(409, 'NO_OPEN_VISIT', "This table has no open visit, so the bottle can't spin.");
const spinActive = () => new AppError(409, 'SPIN_ACTIVE', 'The bottle is already spinning. Try again when it stops.');

function readSpinRequest(body) {
  const { question, seats } = body ?? {};
  const isValid = QUESTIONS.includes(question) && Number.isInteger(seats) && seats >= MIN_SEATS && seats <= MAX_SEATS;
  if (!isValid) throw invalidSpin();
  return { question, seats };
}

function createSpinRepo(db) {
  const insert = db.prepare(`
    INSERT INTO spins (id, visit_id, question, seats, result_seat, started_at) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const latest = db.prepare(`
    SELECT id, visit_id AS visitId, question, seats, result_seat AS resultSeat, started_at AS startedAt
    FROM spins WHERE visit_id = ? ORDER BY started_at DESC, rowid DESC LIMIT 1
  `);
  return {
    insert: (spin) => insert.run(spin.id, spin.visitId, spin.question, spin.seats, spin.resultSeat, spin.startedAt),
    findLatest: (visitId) => latest.get(visitId) ?? null,
  };
}

/** The spin service: one spin per visit per 5 seconds, seat chosen here (BR11.1 to BR11.6). */
function createSpinService({ repo, tables, shared, now, pickSeat }) {
  const elapsedSince = (spin) => now() - Date.parse(spin.startedAt);
  // A clock moved backwards must not hold the table's bottle until it catches up.
  const isRunning = (spin) => {
    const elapsedMs = elapsedSince(spin);
    return elapsedMs >= 0 && elapsedMs < SPIN_MS;
  };

  function createSpin(rawTableId, body) {
    const table = tables.requireTable(rawTableId);
    const request = readSpinRequest(body);
    return shared.withTransaction(() => {
      const visit = shared.getCurrentVisit(table.id);
      if (!visit) throw noOpenVisit();
      const latest = repo.findLatest(visit.id);
      if (latest && isRunning(latest)) throw spinActive();
      const spin = {
        id: randomUUID(),
        visitId: visit.id,
        ...request,
        resultSeat: pickSeat(request.seats),
        startedAt: new Date(now()).toISOString(),
      };
      repo.insert(spin);
      // publishEvent stores it here and sends it only after this transaction commits.
      shared.publishEvent({ type: 'spin.started', tableId: table.id, ...spin, elapsedMs: 0 });
      return { ...spin, elapsedMs: 0 };
    });
  }

  /** BR11.5: the open visit's running spin, or null. Starts no visit. */
  function getCurrentSpin(rawTableId) {
    const table = tables.requireTable(rawTableId);
    const visit = shared.getCurrentVisit(table.id);
    const latest = visit ? repo.findLatest(visit.id) : null;
    return latest && isRunning(latest) ? { ...latest, elapsedMs: elapsedSince(latest) } : null;
  }

  return { createSpin, getCurrentSpin };
}

/**
 * Contract C10 and C16. The factory lets tests supply the clock; the exports below
 * are the module U5 registers.
 */
export function createU7Feature({ now = Date.now, pickSeat = (seats) => randomInt(1, seats + 1) } = {}) {
  return {
    registerRoutes(app, context) {
      const service = createSpinService({
        repo: createSpinRepo(context.db),
        tables: context.tables,
        shared: context.shared,
        now,
        pickSeat,
      });
      app.get('/api/tables/:tableId/spin', (req, res) => res.json(service.getCurrentSpin(req.params.tableId)));
      app.post('/api/tables/:tableId/spin', (req, res) => {
        res.status(201).json(service.createSpin(req.params.tableId, req.body));
      });
    },
    migrations() {
      return [
        {
          id: 'u7-spins',
          sql: `CREATE TABLE spins (
            id TEXT PRIMARY KEY,
            visit_id TEXT NOT NULL REFERENCES visits(id),
            question TEXT NOT NULL CHECK (question IN ('tab', 'dessert')),
            seats INTEGER NOT NULL CHECK (seats BETWEEN 2 AND 8),
            result_seat INTEGER NOT NULL CHECK (result_seat >= 1 AND result_seat <= seats),
            started_at TEXT NOT NULL
          );
          CREATE INDEX spins_by_visit ON spins(visit_id, started_at);`,
        },
      ];
    },
  };
}

const feature = createU7Feature();
export const registerRoutes = feature.registerRoutes;
export const migrations = feature.migrations;
