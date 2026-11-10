export const MOODS = [
  { id: 'light', label: 'Light' },
  { id: 'hearty', label: 'Hearty' },
  { id: 'sweet', label: 'Sweet' },
  { id: 'surprise', label: 'Surprise me' },
];

const SHAKE_THRESHOLD = 18;

export const NO_MATCH_MESSAGE = 'No dish matches that mood and your allergies right now. Try another mood.';

export function suggestionReason(mood) {
  return mood === 'surprise' ? 'The chef picked this one to surprise you.' : `The chef suggests this for a ${mood} mood.`;
}

/** BR12.1: matches the mood ("Surprise me" takes any), not sold out, none of the allergens. */
export function qualifyingDishes(menu, mood, isUnsafe) {
  return menu.categories
    .flatMap((category) => category.items)
    .filter((item) => !item.soldOut && !isUnsafe(item) && (mood === 'surprise' || item.mood === mood));
}

/** One dish picked at random, or null when none qualifies (BR12.3). */
export function pickDish(dishes, random = Math.random) {
  if (dishes.length === 0) return null;
  return dishes[Math.floor(random() * dishes.length)];
}

/** BR12.2: a hard enough movement of the phone counts as a roll. */
export function isShake(acceleration) {
  if (!acceleration) return false;
  const { x = 0, y = 0, z = 0 } = acceleration;
  return Math.hypot(x ?? 0, y ?? 0, z ?? 0) > SHAKE_THRESHOLD;
}
