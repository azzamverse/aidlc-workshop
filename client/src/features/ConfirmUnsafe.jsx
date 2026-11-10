import { dishWarningText, SEVERE_ALLERGY_NOTE } from './allergies.js';
import { Sheet } from './Sheet.jsx';

/** Placing an unsafe cart asks first; Cancel changes nothing (BR3.4). */
export function ConfirmUnsafe({ unsafe, onConfirm, onCancel }) {
  return (
    <Sheet title="Place this order?" onClose={onCancel} testId="confirm-unsafe">
      <div className="warnbox">
        {unsafe.map((dish) => <strong key={dish.itemId}>{dishWarningText(dish)}</strong>)}
        <div className="muted">{SEVERE_ALLERGY_NOTE}</div>
      </div>
      <button className="btn block" onClick={onConfirm} data-testid="confirm-unsafe-place">Place order</button>
      <button className="btn secondary block" onClick={onCancel} data-testid="confirm-unsafe-cancel">Cancel</button>
    </Sheet>
  );
}
