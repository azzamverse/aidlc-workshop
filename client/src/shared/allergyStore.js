/** C13: the diner's allergies on this device. Used by U6's shield and U7's Chef's Dice. */
const STORAGE_KEY = 'table-order.allergies';
export const ALLERGENS = ['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'fish', 'shellfish'];

// Holds the list for this visit when the device refuses to save it.
let unsaved = null;

const onlyKnown = (ids) => [...new Set(ids)].filter((id) => ALLERGENS.includes(id));

function readSaved() {
  try {
    const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? onlyKnown(saved) : [];
  } catch {
    return []; // Missing, corrupt or blocked storage reads as no allergies.
  }
}

export function getAllergies() {
  return unsaved ?? readSaved();
}

export function setAllergies(ids) {
  const allergies = onlyKnown(ids);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(allergies));
    unsaved = null;
  } catch (error) {
    console.warn('The allergies could not be saved on this device.', error);
    unsaved = allergies;
  }
}

/** Reads the dish's allergens only, never its options (BR4.2). */
export function isUnsafe(item) {
  const chosen = getAllergies();
  return (item?.allergens ?? []).some((allergen) => chosen.includes(allergen));
}
