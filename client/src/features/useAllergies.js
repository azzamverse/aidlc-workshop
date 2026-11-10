import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getMenu } from '../shared/api.js';
import { getAllergies, setAllergies } from '../shared/allergyStore.js';
import { unsafeCartDishes } from './allergies.js';

const listeners = new Set();
let snapshot = null;

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentAllergies() {
  snapshot ??= getAllergies();
  return snapshot;
}

/** Saves through U5's store, and every mounted screen updates at once. */
export function saveAllergies(ids) {
  setAllergies(ids);
  snapshot = getAllergies();
  listeners.forEach((listener) => listener());
}

/** The diner's chosen allergens, kept up to date. */
export function useAllergies() {
  return useSyncExternalStore(subscribe, currentAllergies);
}

/** The Cart's unsafe dishes. It reads the menu itself, since cart lines hold no allergens. */
export function useUnsafeDishes(lines) {
  const chosen = useAllergies();
  const [allergensByItem, setAllergensByItem] = useState(null);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getMenu().then(
      (menu) => {
        if (!isCurrent) return;
        const items = menu.categories.flatMap((category) => category.items);
        setAllergensByItem(new Map(items.map((item) => [item.id, item.allergens])));
      },
      (error) => {
        console.warn('The menu could not be read for the allergy check.', error);
        if (isCurrent) setCheckFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  const unsafe = useMemo(
    () => (allergensByItem ? unsafeCartDishes(lines, allergensByItem, chosen) : []),
    [lines, allergensByItem, chosen],
  );
  return { unsafe, checkFailed: checkFailed && chosen.length > 0 };
}
