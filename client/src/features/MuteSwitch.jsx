import { useState } from 'react';
import { isMuted, setMuted } from './alerts.js';

/** Stops sound and vibration on this device; it never stops a banner (BR1.7). */
export function MuteSwitch({ scope }) {
  const [muted, setMutedState] = useState(() => isMuted(scope));

  function toggle() {
    setMuted(scope, !muted);
    setMutedState(!muted);
  }

  return (
    <button className="btn secondary small" onClick={toggle} data-testid="mute-switch">{muted ? 'Unmute' : 'Mute'}</button>
  );
}
