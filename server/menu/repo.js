function toItem(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    image: row.image,
    soldOut: row.sold_out === 1,
  };
}

export function createMenuRepo(db) {
  const selectCategories = db.prepare('SELECT id, name FROM menu_categories ORDER BY position');
  const selectItems = db.prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY position');
  const selectItem = db.prepare('SELECT * FROM menu_items WHERE id = ?');
  const updateSoldOut = db.prepare('UPDATE menu_items SET sold_out = ? WHERE id = ?');

  return {
    listCategoriesWithItems() {
      return selectCategories.all().map((category) => ({
        id: category.id,
        name: category.name,
        items: selectItems.all(category.id).map(toItem),
      }));
    },
    findItem(itemId) {
      const row = selectItem.get(itemId);
      return row ? toItem(row) : null;
    },
    /** Returns true when the item exists. */
    setSoldOut(itemId, soldOut) {
      return updateSoldOut.run(soldOut ? 1 : 0, itemId).changes === 1;
    },
  };
}
