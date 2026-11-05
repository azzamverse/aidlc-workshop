import { itemNotFound, validationFailed } from '../platform/errors.js';

export function createMenuService({ repo, transactions, publishEvent }) {
  function getMenu() {
    return { categories: repo.listCategoriesWithItems() };
  }

  function setSoldOut(itemId, soldOut) {
    if (typeof soldOut !== 'boolean') throw validationFailed('soldOut must be true or false.');
    return transactions.withTransaction(() => {
      if (!repo.setSoldOut(itemId, soldOut)) throw itemNotFound();
      publishEvent({ type: 'menu.item-updated', tableId: null, item: { id: itemId, soldOut } });
      return repo.findItem(itemId);
    });
  }

  return { getMenu, setSoldOut };
}
