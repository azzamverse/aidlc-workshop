import { AllergyPanel } from './AllergyPanel.jsx';
import { RequestButtons } from './RequestButtons.jsx';

/** C14's mount on the Menu. Props: { table, menu, cart, allergyOpen, onAllergyClose }. */
export default function MenuExtras({ table, allergyOpen, onAllergyClose }) {
  return (
    <>
      <RequestButtons table={table} />
      {allergyOpen && <AllergyPanel onClose={onAllergyClose} />}
    </>
  );
}
