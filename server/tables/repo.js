function toVisit(row) {
  return {
    id: row.id,
    tableId: row.table_id,
    status: row.status,
    startedAt: row.started_at,
    closedAt: row.closed_at,
  };
}

export function createTablesRepo(db) {
  const selectTables = db.prepare('SELECT id, label FROM tables ORDER BY id');
  const selectTable = db.prepare('SELECT id, label FROM tables WHERE id = ?');
  const selectOpenVisit = db.prepare("SELECT * FROM visits WHERE table_id = ? AND status = 'Open'");
  const selectVisit = db.prepare('SELECT * FROM visits WHERE id = ?');
  const insertVisitRow = db.prepare('INSERT INTO visits (id, table_id, started_at) VALUES (?, ?, ?)');
  const closeVisitRow = db.prepare(
    "UPDATE visits SET status = 'Closed', closed_at = ? WHERE id = ? AND status = 'Open'",
  );

  return {
    listTables: () => selectTables.all(),
    findTable: (tableId) => selectTable.get(tableId) ?? null,
    findOpenVisit(tableId) {
      const row = selectOpenVisit.get(tableId);
      return row ? toVisit(row) : null;
    },
    findVisit(visitId) {
      const row = selectVisit.get(visitId);
      return row ? toVisit(row) : null;
    },
    insertVisit: ({ id, tableId, startedAt }) => insertVisitRow.run(id, tableId, startedAt),
    /** Returns true when an open visit was closed. */
    closeVisit: (visitId, closedAt) => closeVisitRow.run(closedAt, visitId).changes === 1,
  };
}
