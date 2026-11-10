import { KitchenAlerts } from './KitchenAlerts.jsx';
import { MuteSwitch } from './MuteSwitch.jsx';
import './features.css';

/** C14's mount on the kitchen board. Props: { tables, listenerRef }. */
export default function BoardExtras({ tables, listenerRef }) {
  return (
    <div className="board-extras">
      <div className="board-extras-mute"><MuteSwitch scope="kitchen" /></div>
      <KitchenAlerts tables={tables} listenerRef={listenerRef} />
    </div>
  );
}
