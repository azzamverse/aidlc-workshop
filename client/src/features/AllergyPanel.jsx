import { ALLERGENS } from '../shared/allergyStore.js';
import { SEVERE_ALLERGY_NOTE } from './allergies.js';
import { Sheet } from './Sheet.jsx';
import { saveAllergies, useAllergies } from './useAllergies.js';

const nameOf = (allergen) => allergen[0].toUpperCase() + allergen.slice(1);

/** The eight allergens, saved on this device (BR3.1). */
export function AllergyPanel({ onClose }) {
  const chosen = useAllergies();

  function toggle(allergen) {
    saveAllergies(chosen.includes(allergen) ? chosen.filter((id) => id !== allergen) : [...chosen, allergen]);
  }

  return (
    <Sheet title="Your allergies" onClose={onClose} testId="allergy-panel">
      <p className="muted">We'll mark dishes that contain these. {SEVERE_ALLERGY_NOTE}</p>
      <div className="card">
        {ALLERGENS.map((allergen) => {
          const isOn = chosen.includes(allergen);
          return (
            <button className="choice" key={allergen} aria-pressed={isOn} onClick={() => toggle(allergen)} data-testid={`allergy-${allergen}`}>
              <span>{nameOf(allergen)}</span><span>{isOn ? 'On' : 'Off'}</span>
            </button>
          );
        })}
      </div>
      <button className="btn block" onClick={onClose} data-testid="allergy-done">Done</button>
    </Sheet>
  );
}
