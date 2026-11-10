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

function toOption(row) {
  return {
    id: row.id,
    name: row.name,
    priceDeltaCents: row.price_delta_cents,
    isDefault: row.is_default === 1,
  };
}

export function createMenuRepo(db) {
  const selectAllergens = db.prepare('SELECT allergen FROM item_allergens WHERE item_id = ? ORDER BY allergen');
  const selectMood = db.prepare('SELECT mood FROM item_moods WHERE item_id = ?');
  const selectGroups = db.prepare('SELECT * FROM option_groups WHERE item_id = ? ORDER BY position');
  const selectOptions = db.prepare('SELECT * FROM options WHERE group_id = ? ORDER BY position');
  const selectCategories = db.prepare('SELECT id, name FROM menu_categories ORDER BY position');
  const selectItems = db.prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY position');
  const selectItem = db.prepare('SELECT * FROM menu_items WHERE id = ?');
  const updateSoldOut = db.prepare('UPDATE menu_items SET sold_out = ? WHERE id = ?');

  /** C11: the v1 item plus allergens, mood and optionGroups. */
  function withDetails(row) {
    return {
      ...toItem(row),
      allergens: selectAllergens.all(row.id).map(({ allergen }) => allergen),
      mood: selectMood.get(row.id)?.mood ?? null,
      optionGroups: selectGroups.all(row.id).map((group) => ({
        id: group.id,
        name: group.name,
        kind: group.kind,
        options: selectOptions.all(group.id).map(toOption),
      })),
    };
  }

  const listCategories = (toResult) =>
    selectCategories.all().map((category) => ({
      id: category.id,
      name: category.name,
      items: selectItems.all(category.id).map(toResult),
    }));

  return {
    listCategoriesWithItems: () => listCategories(toItem),
    listCategoriesWithDetails: () => listCategories(withDetails),
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
