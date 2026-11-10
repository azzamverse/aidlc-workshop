import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { getStaffSession, onStaffSessionLost } from '../shared/api.js';
import { PinScreen } from './PinScreen.jsx';
import { gateAfterCheck } from './staffGate.js';

/**
 * The staff frame: the page width every staff screen shares, behind the PIN.
 * Nothing of a staff page renders until a session is confirmed (BR1.6).
 */
export function StaffFrame() {
  const [gate, setGate] = useState('checking');

  const check = useCallback(async () => {
    setGate('checking');
    try {
      await getStaffSession();
      setGate('open');
    } catch (error) {
      if (error.status !== 401) console.warn('The staff session could not be checked.', error);
      setGate(gateAfterCheck(error));
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => onStaffSessionLost(() => setGate('pin')), []);

  if (gate === 'pin') return <PinScreen onSignedIn={check} />;
  return (
    <div className="staff" data-testid="staff-frame">
      {gate === 'open' && <Outlet />}
      {gate === 'failed' && (
        <main className="content">
          <div className="notice error" role="alert" data-testid="staff-check-failed">
            <span aria-hidden="true">⚠</span>
            <span>We couldn't check your staff session. Check your connection and try again.</span>
          </div>
          <button className="btn secondary" onClick={check} data-testid="staff-check-retry">Try again</button>
        </main>
      )}
    </div>
  );
}

/** The live indicator; says so in words when the connection is down, never by colour alone. */
export function LiveIndicator({ connected }) {
  return (
    <span className="live" role="status" data-testid="staff-live">
      <span aria-hidden="true">{connected ? '●' : '↻'}</span>
      {connected ? 'Live' : 'Reconnecting…'}
    </span>
  );
}

/**
 * The bar at the top of a staff screen. A screen passes its title and, as
 * children, whatever sits in the bar (the live indicator, its own buttons).
 */
export function StaffBar({ title, children }) {
  return (
    <header className="staff-bar" data-testid="staff-bar">
      <h1>{title}</h1>
      {children}
    </header>
  );
}
