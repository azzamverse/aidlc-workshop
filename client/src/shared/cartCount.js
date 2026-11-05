import { useSyncExternalStore } from 'react';

/**
 * The number on the Cart tab. The shell shows it; the cart itself lives in U2,
 * which calls setCartCount whenever the cart changes.
 */
let cartCount = 0;
const listeners = new Set();

export function setCartCount(count) {
  cartCount = count;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCartCount() {
  return useSyncExternalStore(subscribe, () => cartCount);
}
