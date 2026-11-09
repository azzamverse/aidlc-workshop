import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cartItemCount,
  cartTotalCents,
  createCartStore,
  soldOutMessage,
} from '../../client/src/screens/diner/cartStore.js';

const coffee = { id: 'coffee', name: 'Coffee', priceCents: 250, image: '☕' };
const pizza = { id: 'pizza', name: 'Pizza', priceCents: 1200, image: '🍕' };
const STORAGE_KEY = 'table-order.cart.5';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

describe('cart store', () => {
  let storage;
  let setCount;
  let keys;

  const open = (visitId = 'visit-1') => {
    const store = createCartStore({ tableId: 5, storage, setCount, newKey: () => `key-${++keys}` });
    store.openVisit(visitId);
    return store;
  };

  beforeEach(() => {
    storage = memoryStorage();
    setCount = vi.fn();
    keys = 0;
  });

  it('joins an existing line and totals price times quantity in whole cents', () => {
    const store = open();
    store.add(coffee);
    store.add(coffee);
    store.add(pizza);
    const { lines } = store.getState();
    expect(lines.map((line) => [line.itemId, line.quantity])).toEqual([['coffee', 2], ['pizza', 1]]);
    expect(cartTotalCents(lines)).toBe(1700);
    expect(cartItemCount(lines)).toBe(3);
    expect(setCount).toHaveBeenLastCalledWith(3);
  });

  it('keeps a quantity between 1 and 20', () => {
    const store = open();
    store.add(coffee);
    store.decrease('coffee');
    expect(store.getState().lines[0].quantity).toBe(1);
    for (let press = 0; press < 25; press += 1) store.add(coffee);
    expect(store.getState().lines[0].quantity).toBe(20);
    store.increase('coffee');
    expect(store.getState().lines[0].quantity).toBe(20);
    store.decrease('coffee');
    expect(store.getState().lines[0].quantity).toBe(19);
  });

  it('keeps the same placement key at a limit, and takes a new one when lines change', () => {
    const store = open();
    store.add(coffee);
    const key = store.getState().placementKey;
    store.decrease('coffee');
    expect(store.getState().placementKey).toBe(key);
    store.increase('coffee');
    expect(store.getState().placementKey).not.toBe(key);
  });

  it('survives a refresh with its lines and placement key', () => {
    const store = open();
    store.add(coffee);
    const { placementKey } = store.getState();
    const reopened = open();
    expect(reopened.getState().lines).toHaveLength(1);
    expect(reopened.getState().placementKey).toBe(placementKey);
    expect(setCount).toHaveBeenLastCalledWith(1);
  });

  it('clears a saved cart from another visit', () => {
    open('visit-1').add(coffee);
    const next = open('visit-2');
    expect(next.getState().lines).toEqual([]);
    expect(next.getState().visitId).toBe('visit-2');
    expect(setCount).toHaveBeenLastCalledWith(0);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)).lines).toEqual([]);
  });

  it.each([
    ['not JSON', '{oops'],
    ['the wrong shape', '{"visitId":"visit-1","placementKey":"k","lines":"many"}'],
    ['a quantity out of range', JSON.stringify({ visitId: 'visit-1', placementKey: 'k', lines: [{ itemId: 'a', name: 'A', unitPriceCents: 1, quantity: 99 }] })],
  ])('treats saved data that is %s as an empty cart', (_name, saved) => {
    storage = memoryStorage({ [STORAGE_KEY]: saved });
    expect(open().getState().lines).toEqual([]);
  });

  it('keeps working in memory when storage refuses', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    const store = open();
    store.add(coffee);
    expect(store.getState().lines).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('removes sold-out items, names them and keeps the rest', () => {
    const store = open();
    store.add(coffee);
    store.add(pizza);
    expect(store.removeItems(['pizza', 'not-in-cart'])).toEqual(['Pizza']);
    expect(store.getState().lines.map((line) => line.itemId)).toEqual(['coffee']);
  });

  it('empties on clear with a new key, and tells subscribers', () => {
    const store = open();
    store.add(coffee);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    const { placementKey } = store.getState();
    store.clear();
    expect(store.getState().lines).toEqual([]);
    expect(store.getState().placementKey).not.toBe(placementKey);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    store.add(coffee);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('sold-out message', () => {
  it('says "it" for one item', () => {
    expect(soldOutMessage(['Ice Cream'])).toBe(
      'Ice Cream just sold out, so we took it out of your cart. Nothing has been ordered yet.',
    );
  });

  it('joins several with "and" and says "them"', () => {
    expect(soldOutMessage(['A', 'B', 'C'])).toBe(
      'A, B and C just sold out, so we took them out of your cart. Nothing has been ordered yet.',
    );
  });
});
