import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { ReadyBanner } from '../features/ReadyBanner.jsx';
import { getTable } from '../shared/api.js';
import { useCartCount } from '../shared/cartCount.js';

function TabBar({ tableId }) {
  const cartCount = useCartCount();
  const base = `/table/${tableId}`;
  return (
    <nav className="tabs" aria-label="Main" data-testid="tab-bar">
      <NavLink className="tab" to={base} end data-testid="tab-menu">
        <span className="icon" aria-hidden="true">🍽️</span>Menu
      </NavLink>
      <NavLink className="tab" to={`${base}/cart`} data-testid="tab-cart">
        <span className="icon" aria-hidden="true">🛒</span>Cart
        {cartCount > 0 && (
          <span className="badge" aria-label={`${cartCount} items`} data-testid="tab-cart-badge">{cartCount}</span>
        )}
      </NavLink>
      <NavLink className="tab" to={`${base}/orders`} data-testid="tab-my-orders">
        <span className="icon" aria-hidden="true">🧾</span>My orders
      </NavLink>
    </nav>
  );
}

function TableNotFound() {
  return (
    <main className="content">
      <section className="card empty" data-testid="table-not-found">
        <div className="big" aria-hidden="true">🔍</div>
        <h3>Table not found</h3>
        <p className="muted">Please check the table number on your table.</p>
      </section>
    </main>
  );
}

function TableError({ onRetry }) {
  return (
    <main className="content">
      <div className="notice error" role="alert" data-testid="table-error">
        <span aria-hidden="true">⚠</span>
        <span>We couldn't open this table. Check your connection and try again.</span>
      </div>
      <button className="btn secondary" onClick={onRetry} data-testid="table-error-retry">Try again</button>
    </main>
  );
}

/**
 * The diner frame: finds the table, starts its visit, and shows the bottom tab
 * bar. Screens read { table, reloadTable } with useOutletContext; table holds
 * { id, label, visitId }. After a table closes, reloadTable starts the next visit.
 */
export function DinerFrame() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  const reloadTable = useCallback(async () => {
    try {
      setState({ status: 'ready', table: await getTable(id) });
    } catch (error) {
      setState({ status: error.code === 'TABLE_NOT_FOUND' ? 'not-found' : 'error' });
    }
  }, [id]);

  useEffect(() => {
    setState({ status: 'loading' });
    reloadTable();
  }, [reloadTable]);

  if (state.status === 'not-found') return <div className="diner"><TableNotFound /></div>;
  return (
    <div className="diner">
      {state.status === 'loading' && <main className="content"><div className="skeleton" data-testid="table-loading" /></main>}
      {state.status === 'error' && <TableError onRetry={reloadTable} />}
      {state.status === 'ready' && <ReadyBanner table={state.table} />}
      {state.status === 'ready' && <Outlet context={{ table: state.table, reloadTable }} />}
      <TabBar tableId={id} />
    </div>
  );
}
