import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllergies, isUnsafe, setAllergies } from '../../client/src/shared/allergyStore.js';

const KEY = 'table-order.allergies';

function stubStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
  return values;
}

describe('allergyStore', () => {
  beforeEach(() => {
    stubStorage();
    setAllergies([]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('saves and reads the chosen allergens', () => {
    const values = stubStorage();
    setAllergies(['nuts', 'dairy']);
    expect(getAllergies()).toEqual(['nuts', 'dairy']);
    expect(JSON.parse(values.get(KEY))).toEqual(['nuts', 'dairy']);
  });

  it.each([
    ['missing', undefined],
    ['corrupt', '{oops'],
    ['not a list', '{"a":1}'],
  ])('%s storage reads as an empty list', (_name, saved) => {
    stubStorage(saved === undefined ? {} : { [KEY]: saved });
    expect(getAllergies()).toEqual([]);
  });

  it('blocked storage reads as an empty list and never throws', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
    });
    expect(getAllergies()).toEqual([]);
  });

  it('no storage at all reads as an empty list', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(getAllergies()).toEqual([]);
  });

  it('drops unknown ids on read', () => {
    stubStorage({ [KEY]: JSON.stringify(['nuts', 'unicorn', 7]) });
    expect(getAllergies()).toEqual(['nuts']);
  });

  it('keeps the list for this visit when saving is refused', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem() {
        throw new Error('full');
      },
    });
    setAllergies(['soy']);
    expect(getAllergies()).toEqual(['soy']);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  describe('isUnsafe', () => {
    it('is true only when a chosen allergen is in the item', () => {
      setAllergies(['nuts']);
      expect(isUnsafe({ allergens: ['gluten', 'nuts'] })).toBe(true);
      expect(isUnsafe({ allergens: ['gluten'] })).toBe(false);
    });

    it('an item with no allergens is not unsafe', () => {
      setAllergies(['nuts']);
      expect(isUnsafe({ allergens: [] })).toBe(false);
      expect(isUnsafe({})).toBe(false);
    });

    it('never reads the options', () => {
      setAllergies(['dairy']);
      const item = { allergens: [], optionGroups: [{ options: [{ name: 'Extra cheese', allergens: ['dairy'] }] }] };
      expect(isUnsafe(item)).toBe(false);
    });
  });
});
