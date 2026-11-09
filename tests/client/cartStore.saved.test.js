import { expect, it } from 'vitest';
import { createCartStore } from '../../client/src/screens/diner/cartStore.js';

it('accepts a saved line with no image, keeping its quantity', () => {
  const saved = {
    visitId: 'visit-1',
    placementKey: 'key-1',
    lines: [{ itemId: 'coffee', name: 'Coffee', unitPriceCents: 250, quantity: 2 }],
  };
  const storage = { getItem: () => JSON.stringify(saved), setItem: () => {} };
  const store = createCartStore({ tableId: 5, storage, setCount: () => {}, newKey: () => 'new' });
  store.openVisit('visit-1');
  expect(store.getState().lines).toEqual(saved.lines);
  expect(store.getState().placementKey).toBe('key-1');
});
