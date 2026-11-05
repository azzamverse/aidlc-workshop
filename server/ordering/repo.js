const ORDER_COLUMNS = `
  o.id, o.number, o.visit_id, o.status, o.placement_key, o.placed_at, v.table_id
  FROM orders o JOIN visits v ON v.id = o.visit_id
`;

export function createOrderingRepo(db) {
  const selectById = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.id = ?`);
  const selectByKey = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.placement_key = ?`);
  const selectByVisit = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.visit_id = ? ORDER BY o.number DESC`);
  const selectLines = db.prepare(
    'SELECT name, quantity, unit_price_cents FROM order_lines WHERE order_id = ? ORDER BY position',
  );
  const selectHighestNumber = db.prepare('SELECT MAX(number) AS highest FROM orders');
  const insertOrderRow = db.prepare(
    'INSERT INTO orders (id, number, visit_id, placement_key, placed_at) VALUES (?, ?, ?, ?, ?)',
  );
  const insertLineRow = db.prepare(`
    INSERT INTO order_lines (id, order_id, item_id, name, unit_price_cents, quantity, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStatusRow = db.prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?');

  /** Builds the API's Order; tableId and totalCents are worked out, not stored. */
  function toOrder(row) {
    const lines = selectLines.all(row.id).map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
    }));
    return {
      id: row.id,
      number: row.number,
      tableId: row.table_id,
      visitId: row.visit_id,
      status: row.status,
      placedAt: row.placed_at,
      totalCents: lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
      lines,
    };
  }

  const toOrderOrNull = (row) => (row ? toOrder(row) : null);

  return {
    findById: (orderId) => toOrderOrNull(selectById.get(orderId)),
    findByPlacementKey: (placementKey) => toOrderOrNull(selectByKey.get(placementKey)),
    listByVisit: (visitId) => selectByVisit.all(visitId).map(toOrder),
    nextNumber: () => (selectHighestNumber.get().highest ?? 0) + 1,
    insertOrder({ id, number, visitId, placementKey, placedAt, lines }) {
      insertOrderRow.run(id, number, visitId, placementKey, placedAt);
      lines.forEach((line, position) => {
        insertLineRow.run(line.id, id, line.itemId, line.name, line.unitPriceCents, line.quantity, position);
      });
    },
    /** Applies the change only if the order is still in `from`; returns whether it did. */
    updateStatusIfCurrent: (orderId, from, to) => updateStatusRow.run(to, orderId, from).changes === 1,
  };
}
