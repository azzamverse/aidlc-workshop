import { Outlet } from 'react-router-dom';

/** The staff frame: the page width every staff screen shares. */
export function StaffFrame() {
  return (
    <div className="staff">
      <Outlet />
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
