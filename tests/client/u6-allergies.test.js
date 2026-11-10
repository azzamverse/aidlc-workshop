import { describe, expect, it } from 'vitest';
import { containsText, dishWarningText, unsafeAllergens, unsafeCartDishes } from '../../client/src/features/allergies.js';

const allergensByItem = new Map([
  ['bread', ['gluten', 'dairy']],
  ['coffee', []],
]);

describe('the allergy marks', () => {
  it('finds only the chosen allergens the dish holds', () => {
    expect(unsafeAllergens(['gluten', 'dairy'], ['dairy', 'nuts'])).toEqual(['dairy']);
  });

  it('no choices means no marks', () => {
    expect(unsafeAllergens(['gluten'], [])).toEqual([]);
  });

  it('copes with a dish that has no allergen list', () => {
    expect(unsafeAllergens(undefined, ['gluten'])).toEqual([]);
  });

  it('says it in words', () => {
    expect(containsText(['peanuts'])).toBe('Contains peanuts');
    expect(containsText(['gluten', 'dairy'])).toBe('Contains gluten and dairy');
  });
});

describe('the unsafe cart', () => {
  const line = (itemId, name, extra = {}) => ({ itemId, name, ...extra });

  it('names each unsafe dish and allergen', () => {
    const dishes = unsafeCartDishes([line('bread', 'Garlic Bread'), line('coffee', 'Coffee')], allergensByItem, ['gluten']);
    expect(dishes).toEqual([{ itemId: 'bread', name: 'Garlic Bread', found: ['gluten'] }]);
    expect(dishWarningText(dishes[0])).toBe('Garlic Bread contains gluten.');
  });

  it('names a dish once when two lines hold it', () => {
    const lines = [line('bread', 'Garlic Bread', { optionIds: ['cheese'] }), line('bread', 'Garlic Bread')];
    expect(unsafeCartDishes(lines, allergensByItem, ['gluten'])).toHaveLength(1);
  });

  it('options never change the warning', () => {
    const lines = [line('coffee', 'Coffee', { optionIds: ['extra-cheese'], optionWords: ['Extra cheese'] })];
    expect(unsafeCartDishes(lines, allergensByItem, ['dairy'])).toEqual([]);
  });

  it('a safe cart has nothing to warn about', () => {
    expect(unsafeCartDishes([line('coffee', 'Coffee')], allergensByItem, ['gluten'])).toEqual([]);
  });

  it('a dish missing from the menu is not called unsafe', () => {
    expect(unsafeCartDishes([line('gone', 'Gone')], allergensByItem, ['gluten'])).toEqual([]);
  });
});
