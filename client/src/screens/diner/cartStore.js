import { newPlacementKey } from '../../shared/api.js';
import { setCartCount } from '../../shared/cartCount.js';

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 20;

const storageKey = (tableId) => `table-order.cart.${tableId}`;

/** BR2.1: whole cents only, so no rounding can creep in. */
export function cartTotalCents(lines) {
  return lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
}

export function cartItemCount(lines) {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

function isValidLine(line) {
  return (
    typeof line?.itemId === 'string' &&
    typeof line.name === 'string' &&
    Number.isInteger(line.unitPriceCents) &&
    Number.isInteger(line.quantity) &&
    line.quantity >= MIN_QUANTITY &&
    line.quantity <= MAX_QUANTITY
  );
}

/** BR2.3: anything unreadable counts as an empty cart. */
function readSaved(storage, key) {
  try {
    const saved = JSON.parse(storage.getItem(key));
    const isUsable =
      typeof saved?.visitId === 'string' &&
      typeof saved.placementKey === 'string' &&
      saved.placementKey !== '' &&
      Array.isArray(saved.lines) &&
      saved.lines.every(isValidLine);
    return isUsable ? saved : null;
  } catch {
    return null;
  }
}

/**
 * The cart for one table on this device, with no React in it. `storage` needs
 * getItem and setItem; when it fails the cart still works until the page closes.
 */
export function createCartStore({ tableId, storage, setCount = () => {}, newKey = newPlacementKey }) {
  const key = storageKey(tableId);
  const listeners = new Set();
  const saved = readSaved(storage, key);
  let state = saved ?? { visitId: null, lines: [], placementKey: newKey() };

  function publish(next) {
    state = next;
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('The cart could not be saved on this device.', error);
    }
    setCount(cartItemCount(state.lines));
    listeners.forEach((listener) => listener());
  }

  /** BR3.2: one placement key belongs to one set of lines. */
  const setLines = (lines) => publish({ ...state, lines, placementKey: newKey() });

  function changeQuantity(itemId, change) {
    const line = state.lines.find((candidate) => candidate.itemId === itemId);
    if (!line) return;
    const quantity = line.quantity + change;
    if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) return;
    setLines(state.lines.map((candidate) => (candidate === line ? { ...line, quantity } : candidate)));
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** BR2.4: a saved cart from a different visit is cleared when the view opens. */
    openVisit(visitId) {
      if (state.visitId === visitId) {
        setCount(cartItemCount(state.lines));
        return;
      }
      publish({ visitId, lines: [], placementKey: newKey() });
    },
    add(item) {
      const existing = state.lines.find((line) => line.itemId === item.id);
      if (existing) {
        changeQuantity(item.id, 1);
        return;
      }
      setLines([
        ...state.lines,
        { itemId: item.id, name: item.name, unitPriceCents: item.priceCents, image: item.image, quantity: 1 },
      ]);
    },
    increase: (itemId) => changeQuantity(itemId, 1),
    decrease: (itemId) => changeQuantity(itemId, -1),
    remove(itemId) {
      setLines(state.lines.filter((line) => line.itemId !== itemId));
    },
    /** BR3.3: takes sold-out items out and returns the names of those it removed. */
    removeItems(itemIds) {
      const removed = state.lines.filter((line) => itemIds.includes(line.itemId));
      setLines(state.lines.filter((line) => !itemIds.includes(line.itemId)));
      return removed.map((line) => line.name);
    },
    /** After a placement or a close: an empty cart with a fresh key, same visit id. */
    clear() {
      setLines([]);
    },
  };
}

/** BR3.3's sentence. Several names are joined with "and" and the sentence says "them". */
export function soldOutMessage(names) {
  const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  const pronoun = names.length > 1 ? 'them' : 'it';
  return `${joined} just sold out, so we took ${pronoun} out of your cart. Nothing has been ordered yet.`;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function deviceStorage() {
  try {
    return globalThis.localStorage ?? memoryStorage();
  } catch {
    return memoryStorage();
  }
}

const stores = new Map();

/** The one store each table has on this page, shared by all three screens. */
export function getCartStore(tableId) {
  if (!stores.has(tableId)) {
    stores.set(tableId, createCartStore({ tableId, storage: deviceStorage(), setCount: setCartCount }));
  }
  return stores.get(tableId);
}
