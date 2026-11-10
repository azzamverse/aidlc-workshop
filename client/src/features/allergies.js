/** The Allergy shield's decisions, with no React in it (BR3.2 to BR3.4). */

export const SEVERE_ALLERGY_NOTE = 'For severe allergies, please check with staff.';

/** The chosen allergens this dish holds. Options never count (BR3.3). */
export const unsafeAllergens = (dishAllergens, chosen) =>
  (dishAllergens ?? []).filter((allergen) => chosen.includes(allergen));

function joinWords(words) {
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0];
}

export const containsText = (found) => `Contains ${joinWords(found)}`;

/** One entry per unsafe dish, however many cart lines hold it. */
export function unsafeCartDishes(lines, allergensByItem, chosen) {
  const dishes = new Map();
  for (const line of lines) {
    const found = unsafeAllergens(allergensByItem.get(line.itemId), chosen);
    if (found.length > 0) dishes.set(line.itemId, { itemId: line.itemId, name: line.name, found });
  }
  return [...dishes.values()];
}

export const dishWarningText = (dish) => `${dish.name} contains ${joinWords(dish.found)}.`;
