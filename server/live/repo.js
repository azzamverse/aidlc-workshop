function toEvent(row) {
  return {
    sequence: row.sequence,
    type: row.type,
    tableId: row.table_id,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
  };
}

export function createLiveRepo(db) {
  const insertRow = db.prepare(
    'INSERT INTO live_events (type, table_id, payload, created_at) VALUES (?, ?, ?, ?) RETURNING *',
  );
  const selectAfter = db.prepare('SELECT * FROM live_events WHERE sequence > ? ORDER BY sequence');
  const selectFirstAfter = db.prepare(
    'SELECT * FROM live_events WHERE sequence > ? ORDER BY sequence LIMIT 1',
  );
  // sqlite_sequence remembers the highest number even after its rows are pruned.
  const selectLatest = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'live_events'");
  const deleteBefore = db.prepare('DELETE FROM live_events WHERE created_at < ?');

  return {
    insert: ({ type, tableId, payload, createdAt }) =>
      toEvent(insertRow.get(type, tableId, JSON.stringify(payload), createdAt)),
    listAfter: (sequence) => selectAfter.all(sequence).map(toEvent),
    findFirstAfter(sequence) {
      const row = selectFirstAfter.get(sequence);
      return row ? toEvent(row) : null;
    },
    latestSequence: () => selectLatest.get()?.seq ?? 0,
    /** Returns how many events were deleted. */
    deleteOlderThan: (instant) => Number(deleteBefore.run(instant).changes),
  };
}
