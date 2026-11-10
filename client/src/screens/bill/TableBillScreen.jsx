import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BillExtras from '../../features/BillExtras.jsx';
import { OptionWords, wordsOfLine } from '../../features/OptionWords.jsx';
import { closeTable, getBill } from '../../shared/api.js';
import { useLiveEvents } from '../../shared/live.js';
import { formatMoney } from '../../shared/money.js';
import { StaffBar } from '../../shell/StaffFrame.jsx';

const STATUS_ICONS = { Pending: '⏳', Preparing: '🍳', Completed: '✓', Cancelled: '✕' };
const CLOSE_FAILED = "We couldn't close this table. Please try again.";
const CLOSE_UNCONFIRMED = "We couldn't confirm the close. The bill below shows where it stands.";

function StatusChip({ status }) {
  return (
    <span className={`status ${status.toLowerCase()}`} aria-live="polite">
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>{status}
    </span>
  );
}

function OrderBill({ order }) {
  return (
    <section className="card" data-testid={`bill-order-${order.number}`}>
      <div className="order-head"><h2>Order #{order.number}</h2><StatusChip status={order.status} /></div>
      <table>
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={index}>
              <td>{line.name}<OptionWords words={wordsOfLine(line)} /></td>
              <td className="num">{line.quantity}</td>
              <td className="num">{formatMoney(line.unitPriceCents)}</td>
              <td className="num">{formatMoney(line.unitPriceCents * line.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan="3">Subtotal</td><td className="num">{formatMoney(order.totalCents)}</td></tr></tfoot>
      </table>
    </section>
  );
}

function joinNumbers(openOrders) {
  const numbers = openOrders.map((order) => `#${order.number}`);
  return numbers.length > 1 ? `${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}` : numbers[0];
}

/** BR3.2's stream. Mounted only once the table is known, so an unknown one opens none. */
function BillStream({ tableId, onChange }) {
  const everConnected = useRef(false);
  const { connected } = useLiveEvents({
    tableId,
    onOpen() {
      everConnected.current = true;
      onChange();
    },
    onEvent(type) {
      if (['order.placed', 'order.updated', 'table.closed', 'resync'].includes(type)) onChange();
    },
  });
  if (!everConnected.current || connected) return null;
  return (
    <div className="notice info" role="status" data-testid="bill-reconnecting">
      <span aria-hidden="true">↻</span><span>Reconnecting… the bill will catch up by itself.</span>
    </div>
  );
}

function CloseButton({ canClose, closing, onClose }) {
  // aria-disabled, not disabled: the button stays reachable, and keeps focus while closing.
  const unavailable = !canClose || closing;
  return (
    <button className="btn" aria-disabled={unavailable} onClick={() => { if (!unavailable) onClose(); }} data-testid="bill-close">Close table</button>
  );
}

/** Contract C5's /staff/tables/:id: the Table Bill, BR3. */
export function TableBillScreen() {
  const { id } = useParams();
  const confirmation = useRef(null);
  const [bill, setBill] = useState(null);
  const [status, setStatus] = useState('loading');
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [message, setMessage] = useState(null);
  const lastRead = useRef(0);

  const load = useCallback(async () => {
    const read = ++lastRead.current;
    try {
      const loaded = await getBill(id);
      if (read !== lastRead.current) return;
      setBill(loaded);
      setStatus('ready');
    } catch (error) {
      if (read !== lastRead.current) return;
      console.warn('The bill could not be loaded.', error);
      setStatus(error.code === 'TABLE_NOT_FOUND' ? 'not-found' : 'failed');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The confirmation stays until staff leave by "Back to board": no timed page change (NFR6).
  useEffect(() => {
    if (closed) confirmation.current?.focus();
  }, [closed]);

  async function close() {
    setClosing(true);
    setMessage(null);
    try {
      await closeTable(id);
      lastRead.current += 1; // A read still running must not bring the bill back.
      setClosed(true);
    } catch (error) {
      console.warn('The table could not be closed.', error);
      if (error.isNetworkError) setMessage(CLOSE_UNCONFIRMED);
      else setMessage(error.code === 'TABLE_NOT_READY' ? error.message : CLOSE_FAILED);
      load();
    } finally {
      setClosing(false);
    }
  }

  const bar = (
    <StaffBar title={`Table ${id} bill`}>
      <Link className="btn secondary small" to="/staff" data-testid="bill-back-to-board">Back to board</Link>
    </StaffBar>
  );

  if (closed) {
    return (
      <>
        {bar}
        <main className="bill">
          <div className="notice info" role="status" tabIndex={-1} ref={confirmation} data-testid="bill-closed">
            <span aria-hidden="true">✓</span><span>Table {id} closed. It's ready for the next diner.</span>
          </div>
        </main>
      </>
    );
  }

  if (status === 'not-found') {
    return (
      <>
        {bar}
        <main className="bill">
          <section className="card empty" data-testid="bill-not-found">
            <div className="big" aria-hidden="true">🔍</div>
            <h3>Table not found</h3>
            <p className="muted">Please check the table number.</p>
          </section>
        </main>
      </>
    );
  }

  const isEmpty = bill?.orders.length === 0;
  const open = bill?.openOrders ?? [];
  return (
    <>
      {bar}
      <main className="bill">
        {bill && <BillStream tableId={id} onChange={load} />}
        {status === 'loading' && (
          <div data-testid="bill-loading" role="status" aria-label="Loading"><div className="skeleton" /></div>
        )}
        {status === 'failed' && (
          <>
            <div className="notice error" role="alert" data-testid="bill-error">
              <span aria-hidden="true">⚠</span><span>We couldn't load this bill. Please try again.</span>
            </div>
            <button className="btn secondary" onClick={load} data-testid="bill-error-retry">Try again</button>
          </>
        )}
        {message && (
          <div className="notice error" role="alert" data-testid="bill-message">
            <span aria-hidden="true">⚠</span><span>{message}</span>
          </div>
        )}
        {bill && open.length > 0 && (
          <div className="notice" role="status" data-testid="bill-still-open">
            <span aria-hidden="true">⏳</span>
            <span>Still open: {open.map((order) => `#${order.number} ${order.status}`).join(', ')}. The table can be closed once these are finished.</span>
          </div>
        )}
        {bill && <BillExtras bill={bill} />}
        {bill?.orders.map((order) => <OrderBill key={order.id} order={order} />)}
        {isEmpty && (
          <section className="card empty" data-testid="bill-empty">
            <div className="big" aria-hidden="true">🧾</div>
            <h3>No orders for this table</h3>
            <p className="muted">Table total {formatMoney(0)}</p>
            {bill.canClose && <p className="muted">Cancelled orders are left off the bill.</p>}
            <CloseButton canClose={bill.canClose} closing={closing} onClose={close} />
          </section>
        )}
        {bill && !isEmpty && (
          <>
            <div className="card total"><span>Table total</span><span className="price" data-testid="bill-total">{formatMoney(bill.totalCents)}</span></div>
            <div className="bill-actions">
              <span className="muted" data-testid="bill-reason">
                Cancelled orders are left off the bill.
                {open.length > 0 && ` Close table is available once ${joinNumbers(open)} ${open.length === 1 ? 'is' : 'are'} finished.`}
              </span>
              <CloseButton canClose={bill.canClose} closing={closing} onClose={close} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
