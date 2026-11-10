import { randomUUID } from 'node:crypto';
import { AppError, validationFailed } from '../platform/errors.js';

const REQUEST_KINDS = new Set(['waiter', 'bill']);

/** Contract C10: U6's add-only steps. */
export function migrations() {
  return [
    {
      id: 'u6-order-line-options',
      sql: `CREATE TABLE order_line_options (
        id TEXT PRIMARY KEY,
        order_line_id TEXT NOT NULL REFERENCES order_lines(id),
        option_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price_delta_cents INTEGER NOT NULL CHECK (price_delta_cents >= 0),
        position INTEGER NOT NULL CHECK (position >= 0),
        UNIQUE (order_line_id, option_id)
      )`,
    },
    {
      id: 'u6-table-requests',
      sql: `CREATE TABLE table_requests (
        id TEXT PRIMARY KEY,
        visit_id TEXT NOT NULL REFERENCES visits(id),
        kind TEXT NOT NULL CHECK (kind IN ('waiter', 'bill')),
        status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'responded')),
        created_at TEXT NOT NULL,
        responded_at TEXT
      )`,
    },
    {
      id: 'u6-one-waiting-request',
      sql: `CREATE UNIQUE INDEX one_waiting_request_per_visit_and_kind
        ON table_requests(visit_id, kind) WHERE status = 'waiting'`,
    },
  ];
}

const REQUEST_COLUMNS = `
  r.id, r.visit_id, r.kind, r.status, r.created_at, r.responded_at, v.table_id, v.status AS visit_status
  FROM table_requests r JOIN visits v ON v.id = r.visit_id
`;

function toRequest(row) {
  return {
    id: row.id,
    tableId: row.table_id,
    visitId: row.visit_id,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

/** C15's requests: one waiting per visit and kind, gone from every read once the visit closes. */
function createTableRequests({ db, tables, shared }) {
  const selectById = db.prepare(`SELECT ${REQUEST_COLUMNS} WHERE r.id = ?`);
  const selectWaitingOfKind = db.prepare(
    `SELECT ${REQUEST_COLUMNS} WHERE r.visit_id = ? AND r.kind = ? AND r.status = 'waiting'`,
  );
  const selectWaitingOfTable = db.prepare(
    `SELECT ${REQUEST_COLUMNS} WHERE v.table_id = ? AND v.status = 'Open' AND r.status = 'waiting' ORDER BY r.created_at, r.kind`,
  );
  const selectAllWaiting = db.prepare(
    `SELECT ${REQUEST_COLUMNS} WHERE v.status = 'Open' AND r.status = 'waiting' ORDER BY r.created_at, r.kind`,
  );
  // The partial unique index holds BR5.2 even if two requests get this far together.
  const insertRequest = db.prepare(`
    INSERT OR IGNORE INTO table_requests (id, visit_id, kind, status, created_at) VALUES (?, ?, ?, 'waiting', ?)
  `);
  const markResponded = db.prepare(
    "UPDATE table_requests SET status = 'responded', responded_at = ? WHERE id = ? AND status = 'waiting'",
  );

  const publishChange = (tableId, kind, status) =>
    shared.publishEvent({ type: 'table-request.updated', tableId, kind, status });

  /** Returns the waiting request of this kind, creating it only when there is none (BR5.1, BR5.2). */
  function createOrReturn(rawTableId, body) {
    const table = tables.requireTable(rawTableId);
    const kind = body?.kind;
    if (!REQUEST_KINDS.has(kind)) throw validationFailed('A request must be for the waiter or the bill.');
    return shared.withTransaction(() => {
      const visit = shared.getCurrentVisit(table.id);
      if (!visit) throw new AppError(409, 'NO_OPEN_VISIT', 'This table has no open visit.');
      const isNew = insertRequest.run(randomUUID(), visit.id, kind, new Date().toISOString()).changes === 1;
      if (isNew) publishChange(table.id, kind, 'waiting');
      return toRequest(selectWaitingOfKind.get(visit.id, kind));
    });
  }

  function listForTable(rawTableId) {
    const table = tables.requireTable(rawTableId);
    return { requests: selectWaitingOfTable.all(table.id).map(toRequest) };
  }

  const listAll = () => ({ requests: selectAllWaiting.all().map(toRequest) });

  /** BR5.4: clears one request. A repeat, or a request of a closed visit, changes nothing. */
  function respond(requestId) {
    return shared.withTransaction(() => {
      const row = selectById.get(requestId);
      if (!row) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found.');
      if (row.status !== 'waiting' || row.visit_status !== 'Open') return toRequest(row);
      markResponded.run(new Date().toISOString(), requestId);
      publishChange(row.table_id, row.kind, 'responded');
      return toRequest(selectById.get(requestId));
    });
  }

  return { createOrReturn, listForTable, listAll, respond };
}

/** Contract C10: U6's routes, on `app`, before the API router answers 404. */
export function registerRoutes(app, context) {
  const requests = createTableRequests(context);
  const { requireStaff } = context;

  app.get('/api/tables/:tableId/requests', (req, res) => res.json(requests.listForTable(req.params.tableId)));
  app.post('/api/tables/:tableId/requests', (req, res) => {
    res.json(requests.createOrReturn(req.params.tableId, req.body));
  });
  app.get('/api/requests', requireStaff, (req, res) => res.json(requests.listAll()));
  app.post('/api/requests/:id/respond', requireStaff, (req, res) => res.json(requests.respond(req.params.id)));
}
