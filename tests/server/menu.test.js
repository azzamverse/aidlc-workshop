import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from './context-helper.js';

describe('menu service', () => {
  let context;
  let frames;

  beforeEach(() => {
    context = createTestContext();
    frames = [];
    context.live.subscribe({ send: (frame) => frames.push(frame) });
    frames.length = 0;
  });

  afterEach(() => context.cleanup());

  it('serves 4 categories in order with 12 items', () => {
    const { categories } = context.menu.getMenu();
    expect(categories.map((category) => category.id)).toEqual(['starters', 'mains', 'desserts', 'drinks']);
    expect(categories.flatMap((category) => category.items)).toHaveLength(12);
  });

  it('serves every item with name, price, description, image and mark', () => {
    for (const item of context.menu.getMenu().categories.flatMap((category) => category.items)) {
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.image).toBeTruthy();
      expect(Number.isInteger(item.priceCents)).toBe(true);
      expect(item.soldOut).toBe(false);
    }
  });

  it('stores a sold-out mark and returns the item', () => {
    expect(context.menu.setSoldOut('coffee', true)).toMatchObject({ id: 'coffee', soldOut: true });
    const drinks = context.menu.getMenu().categories[3];
    expect(drinks.items.find((item) => item.id === 'coffee').soldOut).toBe(true);
  });

  it('clears a sold-out mark', () => {
    context.menu.setSoldOut('coffee', true);
    expect(context.menu.setSoldOut('coffee', false).soldOut).toBe(false);
  });

  it('publishes menu.item-updated with no table', () => {
    context.menu.setSoldOut('coffee', true);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain('event: menu.item-updated');
    expect(frames[0]).toContain('"tableId":null');
    expect(frames[0]).toContain('"item":{"id":"coffee","soldOut":true}');
  });

  it('refuses an unknown item and publishes nothing', () => {
    expect(() => context.menu.setSoldOut('nope', true)).toThrowError(
      expect.objectContaining({ status: 404, code: 'ITEM_NOT_FOUND' }),
    );
    expect(frames).toEqual([]);
  });

  it('refuses a mark that is not true or false', () => {
    expect(() => context.menu.setSoldOut('coffee', 'yes')).toThrowError(
      expect.objectContaining({ status: 400, code: 'VALIDATION_FAILED' }),
    );
  });
});
