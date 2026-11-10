const ORDER_COLUMNS = `
  o.id, o.number, o.visit_id, o.status, o.placement_key, o.placed_at, v.table_id
  FROM orders o JOIN visits v ON v.id = o.visit_id
`;

export function createOrderingRepo(db) {
  const selectById = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.id = ?`);
  const selectByKey = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.placement_key = ?`);
  const selectByVisit = db.prepare(`SELECT ${ORDER_COLUMNS} WHERE o.visit_id = ? ORDER BY o.number DESC`);
  const selectLines = db.prepare(
    'SELECT id, name, quantity, unit_price_cents FROM order_lines WHERE order_id = ? ORDER BY position',
  );
  // U6's upgrade step adds this table; a database opened without feature steps has none.
  const hasOptionsTable = Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'order_line_options'").get(),
  );
  const selectLineOptions = hasOptionsTable
    ? db.prepare('SELECT option_id, name, price_delta_cents FROM order_line_options WHERE order_line_id = ? ORDER BY position')
    : null;
  const selectGroups = db.prepare('SELECT id, name, kind FROM option_groups WHERE item_id = ? ORDER BY position');
  const selectOptions = db.prepare(
    'SELECT id, name, price_delta_cents, is_default FROM options WHERE group_id = ? ORDER BY position',
  );
  const countOpenBeforeRow = db.prepare(`
    SELECT COUNT(*) AS count FROM orders
    WHERE status IN ('Pending', 'Preparing') AND (placed_at < ? OR (placed_at = ? AND number < ?))
  `);
  const selectHighestNumber = db.prepare('SELECT MAX(number) AS highest FROM orders');
  const insertOrderRow = db.prepare(
    'INSERT INTO orders (id, number, visit_id, placement_key, placed_at) VALUES (?, ?, ?, ?, ?)',
  );
  const insertLineRow = db.prepare(`
    INSERT INTO order_lines (id, order_id, item_id, name, unit_price_cents, quantity, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStatusRow = db.prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?');

  /** BR4.9: a line with no recorded options has no `options` field, exactly as in v1. */
  function toLine(line) {
    const options = (selectLineOptions?.all(line.id) ?? []).map((option) => ({
      optionId: option.option_id,
      name: option.name,
      priceDeltaCents: option.price_delta_cents,
    }));
    return {
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      ...(options.length > 0 ? { options } : {}),
    };
  }

  /** Builds the API's Order; tableId and totalCents are worked out, not stored. */
  function toOrder(row) {
    const lines = selectLines.all(row.id).map(toLine);
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

  function insertLineOptions(lineId, options) {
    const insertOption = db.prepare(`
      INSERT INTO order_line_options (id, order_line_id, option_id, name, price_delta_cents, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    options.forEach((option, position) => {
      insertOption.run(option.id, lineId, option.optionId, option.name, option.priceDeltaCents, position);
    });
  }

  return {
    findById: (orderId) => toOrderOrNull(selectById.get(orderId)),
    findByPlacementKey: (placementKey) => toOrderOrNull(selectByKey.get(placementKey)),
    listByVisit: (visitId) => selectByVisit.all(visitId).map(toOrder),
    nextNumber: () => (selectHighestNumber.get().highest ?? 0) + 1,
    insertOrder({ id, number, visitId, placementKey, placedAt, lines }) {
      insertOrderRow.run(id, number, visitId, placementKey, placedAt);
      lines.forEach((line, position) => {
        insertLineRow.run(line.id, id, line.itemId, line.name, line.unitPriceCents, line.quantity, position);
        if (line.options?.length > 0) insertLineOptions(line.id, line.options);
      });
    },
    /** The dish's choices, as the placing transaction sees them (BR4.4). */
    listOptionGroups: (itemId) =>
      selectGroups.all(itemId).map((group) => ({
        id: group.id,
        name: group.name,
        kind: group.kind,
        options: selectOptions.all(group.id).map((option) => ({
          id: option.id,
          name: option.name,
          priceDeltaCents: option.price_delta_cents,
          isDefault: option.is_default === 1,
        })),
      })),
    /** BR6.2: Pending or Preparing orders placed earlier, across all tables. */
    countOpenBefore: ({ placedAt, number }) => countOpenBeforeRow.get(placedAt, placedAt, number).count,
    /** Applies the change only if the order is still in `from`; returns whether it did. */
    updateStatusIfCurrent: (orderId, from, to) => updateStatusRow.run(to, orderId, from).changes === 1,
  };
}
