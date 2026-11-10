import { dishWarningText, SEVERE_ALLERGY_NOTE } from './allergies.js';

/** C14's mount on the Cart: the allergy warning. Props: { table, lines, unsafe, checkFailed }. */
export default function CartExtras({ unsafe = [], checkFailed = false }) {
  if (checkFailed) {
    return <div className="warnbox" role="status" data-testid="allergy-check-failed">We couldn't check your cart for allergens. {SEVERE_ALLERGY_NOTE}</div>;
  }
  if (unsafe.length === 0) return null;
  return (
    <div className="warnbox" data-testid="allergy-warning">
      {unsafe.map((dish) => <strong key={dish.itemId}>{dishWarningText(dish)}</strong>)}
      <div className="muted">{SEVERE_ALLERGY_NOTE}</div>
    </div>
  );
}
