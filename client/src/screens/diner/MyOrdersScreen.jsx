import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrderExtras from '../../features/OrderExtras.jsx';
import { cancelOrder, getTableOrders } from '../../shared/api.js';
import { formatMoney } from '../../shared/money.js';
import { ClosedScreen, EmptyView, Notice, ReconnectingNotice, Skeletons, SlotView, TopBar } from './parts.jsx';
import { cancelRefusedMessage, mergeOrder, ordersForVisit } from './sessionLogic.js';
import { useDinerSession } from './useDinerSession.js';

const STATUS_ICONS = { Pending: '⏳', Preparing: '🍳', Completed: '✓', Cancelled: '✕' };

// C14: each file loads only when its pill is opened; U7 replaces them.
const VIEWS = [
  { id: 'orders', label: 'Orders' },
  { id: 'table', label: 'Table', View: lazy(() => import('../../xfactors/LivingTable.jsx')) },
  { id: 'kitchen', label: 'Kitchen', View: lazy(() => import('../../xfactors/KitchenTheatre.jsx')) },
  { id: 'bottle', label: 'Bottle', View: lazy(() => import('../../xfactors/SpinTheBottle.jsx')) },
];

function ViewSwitcher({ current, onChange }) {
  return (
    <div className="pills switcher" role="group" aria-label="My orders views" data-testid="orders-switcher">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          className={view.id === current ? 'pill active' : 'pill'}
          aria-pressed={view.id === current}
          onClick={() => onChange(view.id)}
          data-testid={`orders-view-${view.id}`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

function StatusChip({ status }) {
  return (
    <span className={`status ${status.toLowerCase()}`} aria-live="polite">
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>{status}
    </span>
  );
}

function OrderCard({ order, busy, onCancel }) {
  const price = formatMoney(order.totalCents);
  return (
    <article className="card" data-testid={`order-${order.number}`}>
      <div className="order-head"><h3>Order #{order.number}</h3><StatusChip status={order.status} /></div>
      <ul className="order-lines">
        {order.lines.map((line, index) => <li key={index}>{line.quantity} × {line.name}</li>)}
      </ul>
      <div className="line">
        {order.status === 'Cancelled' ? (
          <span className="muted"><s>{price}</s> · Not on the bill</span>
        ) : (
          <span className="price">{price}</span>
        )}
        {order.status === 'Pending' && (
          <button className="btn secondary small" disabled={busy} onClick={() => onCancel(order)} data-testid={`order-cancel-${order.number}`}>Cancel order</button>
        )}
      </div>
    </article>
  );
}

/** Contract C5's /table/:id/orders: My orders, BR4 and BR5. */
export function MyOrdersScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  // Read once, and taken out of the address's state so a refresh does not repeat it.
  const [placedNumber] = useState(location.state?.placedNumber ?? null);
  const [orders, setOrders] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refusal, setRefusal] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [viewId, setViewId] = useState('orders');
  const lastRead = useRef(0);
  const visitId = useRef(null);

  useEffect(() => {
    if (location.state?.placedNumber) navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  const loadOrders = useCallback(async (tableId) => {
    const read = ++lastRead.current;
    setLoadFailed(false);
    try {
      const { orders: loaded } = await getTableOrders(tableId);
      if (read === lastRead.current) setOrders(ordersForVisit(loaded, visitId.current));
    } catch (error) {
      console.warn('The orders could not be loaded.', error);
      if (read === lastRead.current) setLoadFailed(true);
    }
  }, []);

  const session = useDinerSession({
    onReload: () => loadOrders(session.table.id),
    onClosed: () => setOrders([]),
    onEvent(type, data) {
      if (type !== 'order.placed' && type !== 'order.updated') return;
      // Nothing read yet: a read started now includes this event.
      if (orders === null) {
        loadOrders(session.table.id);
        return;
      }
      lastRead.current += 1; // An older read still running must not undo this event.
      setOrders((current) => mergeOrder(current ?? [], data.order, visitId.current));
    },
  });
  const { table, closed, reconnecting, cart } = session;
  visitId.current = table.visitId;

  async function cancel(order) {
    setCancelling(order.id);
    setRefusal(null);
    try {
      const updated = await cancelOrder(table.id, order.id);
      setOrders((current) => mergeOrder(current ?? [], updated, table.visitId));
    } catch (error) {
      if (error.code === 'ORDER_STATE_CONFLICT') {
        const status = error.details.currentStatus;
        setOrders((current) => mergeOrder(current ?? [], { ...order, status }, table.visitId));
        setRefusal({ icon: status === 'Preparing' ? '🍳' : '⚠', text: cancelRefusedMessage(order.number, status) });
      } else {
        console.warn('The order could not be cancelled.', error);
        setRefusal({ icon: '⚠', kind: 'error', text: `We couldn't cancel Order #${order.number}. Please try again.` });
      }
    } finally {
      setCancelling(null);
    }
  }

  if (closed) return <ClosedScreen title="My orders" label={table.label} />;

  const showError = loadFailed && orders === null;
  const { View } = VIEWS.find((view) => view.id === viewId);
  return (
    <>
      <TopBar title="My orders" label={table.label} />
      <main className="content">
        <OrderExtras table={table} orders={orders ?? []} />
        <ViewSwitcher current={viewId} onChange={setViewId} />
        {reconnecting && <ReconnectingNotice />}
        {placedNumber !== null && (
          <Notice kind="info" icon="✓" role="status" testId="order-placed">Order #{placedNumber} placed. We'll keep its status updated here.</Notice>
        )}
        {refusal && <Notice kind={refusal.kind} icon={refusal.icon} testId="order-refused">{refusal.text}</Notice>}
        {View ? (
          <SlotView><View table={table} orders={orders ?? []} onAddToCart={cart.add} /></SlotView>
        ) : (
          <>
            {orders === null && !showError && <Skeletons testId="orders-loading" />}
            {showError && (
              <>
                <Notice kind="error" icon="⚠" testId="orders-error">We couldn't load your orders. Check your connection and try again.</Notice>
                <button className="btn secondary" onClick={() => loadOrders(table.id)} data-testid="orders-error-retry">Try again</button>
              </>
            )}
            {orders?.length === 0 && (
              <EmptyView icon="🧾" title="No orders yet" text="Orders from your table will show here." tableId={table.id} testId="orders-empty" />
            )}
            {orders?.map((order) => <OrderCard key={order.id} order={order} busy={cancelling === order.id} onCancel={cancel} />)}
          </>
        )}
      </main>
    </>
  );
}
