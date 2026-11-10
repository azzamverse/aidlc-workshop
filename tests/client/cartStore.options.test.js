import { describe, expect, it, vi } from 'vitest';
import { cartTotalCents, createCartStore, keyOfLine, lineKeyOf, resolveOptionIds } from '../../client/src/screens/diner/cartStore.js';

const SPICE = { id: 'spice', kind: 'one', options: [{ id: 'mild', priceDeltaCents: 0, isDefault: false }, { id: 'medium', priceDeltaCents: 0, isDefault: true }] };
const SIZE = { id: 'size', kind: 'one', options: [{ id: 'regular', priceDeltaCents: 0, isDefault: true }, { id: 'large', priceDeltaCents: 300, isDefault: false }] };
const EXTRAS = { id: 'extras', kind: 'any', options: [{ id: 'cheese', priceDeltaCents: 150, isDefault: false }, { id: 'bacon', priceDeltaCents: 200, isDefault: false }] };
const pizza = { id: 'pizza', name: 'Pizza', priceCents: 1200, image: '🍕', optionGroups: [SIZE, SPICE, EXTRAS] };
const coffee = { id: 'coffee', name: 'Coffee', priceCents: 250, image: '☕', optionGroups: [] };
const menuOf = (...items) => ({ categories: [{ id: 'c', name: 'C', items }] });

function open(saved) {
  const values = new Map(saved ? [['table-order.cart.5', JSON.stringify(saved)]] : []);
  let keys = 0;
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  return createCartStore({ tableId: 5, storage, newKey: () => `key-${(keys += 1)}` });
}

const v1Saved = (lines) => ({ visitId: 'v', placementKey: 'saved-key', lines });
const v1Line = (itemId, quantity = 2) => ({ itemId, name: itemId, unitPriceCents: 1200, quantity });

describe('lineKeyOf', () => {
  it('is the item id plus the sorted option ids', () => {
    expect(lineKeyOf('pizza', ['medium', 'large'])).toBe(lineKeyOf('pizza', ['large', 'medium']));
    expect(lineKeyOf('pizza', ['large'])).toBe('pizza|large');
  });

  it('is the bare item id with no options, and does not reorder the list it was given', () => {
    const ids = ['b', 'a'];
    expect(lineKeyOf('coffee')).toBe('coffee');
    lineKeyOf('x', ids);
    expect(ids).toEqual(['b', 'a']);
  });
});

describe('resolveOptionIds', () => {
  it('uses the defaults when none are given', () => {
    expect(resolveOptionIds(pizza)).toEqual(['regular', 'medium']);
  });

  it('drops unknown ids, and an emptied pick-one group takes its default', () => {
    expect(resolveOptionIds(pizza, ['nope', 'cheese'])).toEqual(['regular', 'medium', 'cheese']);
  });

  it('keeps one choice in a pick-one group', () => {
    expect(resolveOptionIds(pizza, ['mild', 'medium', 'large'])).toEqual(['large', 'mild']);
  });

  it('copes with an item that has no groups', () => {
    expect(resolveOptionIds({ id: 'x', priceCents: 1 })).toEqual([]);
    expect(resolveOptionIds({ id: 'x', priceCents: 1 }, ['a'])).toEqual([]);
  });
});

describe('cart lines with options', () => {
  it('add with no options takes the defaults', () => {
    const store = open();
    store.add(pizza);
    expect(store.getState().lines[0]).toMatchObject({ optionIds: ['regular', 'medium'], unitPriceCents: 1200, lineKey: lineKeyOf('pizza', ['regular', 'medium']) });
  });

  it('the same choices join one line, and different ones make two', () => {
    const store = open();
    store.add(pizza, ['cheese', 'medium', 'regular']);
    store.add(pizza, ['regular', 'medium', 'cheese']);
    store.add(pizza, ['large']);
    expect(store.getState().lines.map((line) => line.quantity)).toEqual([2, 1]);
  });

  it('prices a line with its options, in whole cents', () => {
    const store = open();
    store.add(pizza, ['large', 'cheese']);
    expect(store.getState().lines[0].unitPriceCents).toBe(1650);
    expect(cartTotalCents(store.getState().lines)).toBe(1650);
  });

  it('changes and removes one line by its key, leaving the other', () => {
    const store = open();
    store.add(pizza);
    store.add(pizza, ['large']);
    const [first, second] = store.getState().lines;
    store.increase(keyOfLine(first));
    expect(store.getState().lines.map((line) => line.quantity)).toEqual([2, 1]);
    store.remove(keyOfLine(second));
    expect(store.getState().lines).toHaveLength(1);
  });

  it('an item with no options still gets a plain line, as in v1', () => {
    const store = open();
    store.add(coffee);
    expect(store.getState().lines[0]).toEqual({ itemId: 'coffee', name: 'Coffee', unitPriceCents: 250, image: '☕', quantity: 1 });
  });
});

describe('saved v1 lines', () => {
  it('keep no options and their key until the menu is read', () => {
    const store = open(v1Saved([v1Line('pizza')]));
    expect(store.getState().lines[0].optionIds).toBeUndefined();
    expect(keyOfLine(store.getState().lines[0])).toBe('pizza');
  });

  it('take the defaults when the menu is read, keeping quantity and placement key', () => {
    const store = open(v1Saved([v1Line('pizza', 3)]));
    store.applyMenu(menuOf(pizza));
    expect(store.getState().lines[0]).toMatchObject({ quantity: 3, optionIds: ['regular', 'medium'] });
    expect(store.getState().placementKey).toBe('saved-key');
  });

  it('a menu with no details for the line leaves it alone', () => {
    const store = open(v1Saved([v1Line('coffee')]));
    const listener = vi.fn();
    store.subscribe(listener);
    store.applyMenu(menuOf(coffee));
    expect(listener).not.toHaveBeenCalled();
  });

  it('reading the menu again changes nothing', () => {
    const store = open(v1Saved([v1Line('pizza')]));
    store.applyMenu(menuOf(pizza));
    const listener = vi.fn();
    store.subscribe(listener);
    store.applyMenu(menuOf(pizza));
    expect(listener).not.toHaveBeenCalled();
  });

  it('a saved line joins a line that already has the same choices', () => {
    const store = open(v1Saved([v1Line('pizza', 2), { ...v1Line('pizza', 1), lineKey: lineKeyOf('pizza', ['regular', 'medium']), optionIds: ['regular', 'medium'] }]));
    store.applyMenu(menuOf(pizza));
    expect(store.getState().lines).toHaveLength(1);
    expect(store.getState().lines[0].quantity).toBe(3);
    expect(store.getState().placementKey).not.toBe('saved-key');
  });

  it('a menu item gone from the menu leaves the line as it was', () => {
    const store = open(v1Saved([v1Line('gone')]));
    store.applyMenu(menuOf(pizza));
    expect(store.getState().lines[0].optionIds).toBeUndefined();
  });
});
