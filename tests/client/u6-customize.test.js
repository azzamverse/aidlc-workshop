import { describe, expect, it } from 'vitest';
import { inMenuOrder, toggleOption } from '../../client/src/features/customize.js';
import { createCartStore, keyOfLine, placementLine, resolveOptionIds, testKeyOfLine, unitPriceCents } from '../../client/src/screens/diner/cartStore.js';

const SIZE = { id: 'size', name: 'Size', kind: 'one', options: [{ id: 'regular', name: 'Regular', priceDeltaCents: 0, isDefault: true }, { id: 'large', name: 'Large', priceDeltaCents: 300, isDefault: false }] };
const SPICE = { id: 'spice', name: 'Spice', kind: 'one', options: [{ id: 'medium', name: 'Medium', priceDeltaCents: 0, isDefault: true }, { id: 'hot', name: 'Hot', priceDeltaCents: 0, isDefault: false }] };
const EXTRAS = { id: 'extras', name: 'Extras', kind: 'any', options: [{ id: 'cheese', name: 'Extra cheese', priceDeltaCents: 150, isDefault: false }, { id: 'bacon', name: 'Bacon', priceDeltaCents: 200, isDefault: false }] };
const pizza = { id: 'pizza', name: 'Pizza', priceCents: 1200, image: '🍕', optionGroups: [SIZE, SPICE, EXTRAS] };

function newStore() {
  const values = new Map();
  let keys = 0;
  return createCartStore({
    tableId: 7,
    storage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    newKey: () => `key-${(keys += 1)}`,
  });
}

describe('choosing options', () => {
  it('a pick-one group always keeps exactly one value', () => {
    expect(toggleOption(['regular', 'medium'], SIZE, 'large')).toEqual(['medium', 'large']);
    expect(toggleOption(['large', 'medium'], SIZE, 'large')).toEqual(['medium', 'large']);
  });

  it('a pick-any group allows none or several', () => {
    const one = toggleOption([], EXTRAS, 'cheese');
    const both = toggleOption(one, EXTRAS, 'bacon');
    expect(both).toEqual(['cheese', 'bacon']);
    expect(toggleOption(toggleOption(both, EXTRAS, 'cheese'), EXTRAS, 'bacon')).toEqual([]);
  });

  it('keeps menu order for sending', () => {
    expect(inMenuOrder(pizza, ['bacon', 'hot', 'large'])).toEqual(['large', 'hot', 'bacon']);
  });
});

describe('the running price', () => {
  it('starts at the item price with defaults', () => {
    expect(unitPriceCents(pizza, resolveOptionIds(pizza))).toBe(1200);
  });

  it('adds each choice, in exact cents', () => {
    expect(unitPriceCents(pizza, ['large', 'hot', 'cheese', 'bacon'])).toBe(1850);
  });

  it('drops a price when a choice is removed', () => {
    const chosen = toggleOption(['regular', 'medium', 'cheese'], EXTRAS, 'cheese');
    expect(unitPriceCents(pizza, chosen)).toBe(1200);
  });
});

describe('cart lines and their words', () => {
  it('a line of defaults keeps the dish\'s own test key and sends no option ids', () => {
    const store = newStore();
    store.add(pizza);
    const [line] = store.getState().lines;
    expect(line.optionWords).toBeUndefined();
    expect(testKeyOfLine(line)).toBe('pizza');
    expect(placementLine(line)).toEqual({ itemId: 'pizza', quantity: 1 });
  });

  it('a line with choices has its words, its own test key and sends its ids', () => {
    const store = newStore();
    store.add(pizza, ['large', 'hot', 'cheese']);
    const [line] = store.getState().lines;
    expect(line.optionWords).toEqual(['Large', 'Hot', 'Extra cheese']);
    expect(testKeyOfLine(line)).toBe(keyOfLine(line));
    expect(placementLine(line).optionIds).toEqual(expect.arrayContaining(['large', 'hot', 'cheese']));
  });

  it('one dish with two sets of choices has two test keys', () => {
    const store = newStore();
    store.add(pizza);
    store.add(pizza, ['large']);
    const keys = store.getState().lines.map(testKeyOfLine);
    expect(new Set(keys).size).toBe(2);
  });

  it('a sold-out dish loses every line and is named once', () => {
    const store = newStore();
    store.add(pizza);
    store.add(pizza, ['large']);
    expect(store.removeItems(['pizza'])).toEqual(['Pizza']);
    expect(store.getState().lines).toEqual([]);
  });
});
