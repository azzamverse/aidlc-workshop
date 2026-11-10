import { MuteSwitch } from './MuteSwitch.jsx';

/** C14's mount on My orders: the diner's mute switch. Props: { table, orders }. */
export default function OrderExtras() {
  return <div className="order-extras"><MuteSwitch scope="diner" /></div>;
}
