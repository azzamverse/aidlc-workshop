import { containsText, unsafeAllergens } from './allergies.js';

/** "Contains X" in words, never colour alone. No choices means no mark (BR3.2). */
export function ContainsTag({ item, chosen }) {
  const found = unsafeAllergens(item.allergens, chosen);
  if (found.length === 0) return null;
  return <span className="tag warn" data-testid={`menu-contains-${item.id}`}>{containsText(found)}</span>;
}
