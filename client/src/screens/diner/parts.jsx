import { Link } from 'react-router-dom';

/** Parts more than one diner screen shows. Words come from the refined mockups. */
export function TopBar({ title, label, children }) {
  return (
    <header className="topbar">
      <div className="title"><h1>{title}</h1><span className="muted">{label}</span></div>
      {children}
    </header>
  );
}

export function ClosedCard() {
  return (
    <section className="card empty" role="status" data-testid="table-closed">
      <div className="big" aria-hidden="true">👋</div>
      <h3>This table was closed</h3>
      <p className="muted">Thanks for visiting. Your cart and orders have been cleared.</p>
    </section>
  );
}

export function ReconnectingNotice() {
  return (
    <div className="notice info" role="status" data-testid="reconnecting">
      <span aria-hidden="true">↻</span>
      <span>Reconnecting… we'll catch up on any changes.</span>
    </div>
  );
}

/** What every screen shows in place of itself once its table closed (BR6.1). */
export function ClosedScreen({ title, label }) {
  return (
    <>
      <TopBar title={title} label={label} />
      <main className="content"><ClosedCard /></main>
    </>
  );
}

export function Notice({ kind = '', icon, role = 'alert', testId, children }) {
  return (
    <div className={`notice ${kind}`.trim()} role={role} data-testid={testId}>
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function EmptyView({ icon, title, text, tableId, testId }) {
  return (
    <section className="card empty" data-testid={testId}>
      <div className="big" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      <Link className="btn" to={`/table/${tableId}`}>Browse the menu</Link>
    </section>
  );
}

export function Skeletons({ testId, count = 3 }) {
  return (
    <div className="content-skeletons" data-testid={testId} aria-label="Loading" role="status">
      {Array.from({ length: count }, (_, index) => <div className="skeleton" key={index} />)}
    </div>
  );
}
