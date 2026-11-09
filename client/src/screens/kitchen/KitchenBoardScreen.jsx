import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBoard, moveOrder } from '../../shared/api.js';
import { useLiveEvents } from '../../shared/live.js';
import { LiveIndicator, StaffBar } from '../../shell/StaffFrame.jsx';
import { AvailabilityPanel } from './AvailabilityPanel.jsx';
import { applyRead, clearTables, isNew, mergeOrder, moveOffered, moveRefusedMessage } from './boardLogic.js';

const STATUS_ICONS = { Pending: '⏳', Preparing: '🍳', Completed: '✓', Cancelled: '✕' };

function StatusChip({ status }) {
  return (
    <span className={`status ${status.toLowerCase()}`} aria-live="polite">
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>{status}
    </span>
  );
}

function OrderCard({ order, moving, onMove }) {
  const move = moveOffered(order.status);
  const highlighted = isNew(order);
  return (
    <div className={highlighted ? 'order new' : 'order'} data-testid={`board-order-${order.number}`}>
      <div className="order-title">
        <span>#{order.number}{highlighted && <> <span className="new-tag">★ New</span></>}</span>
        <StatusChip status={order.status} />
      </div>
      <div className="muted">
        {order.lines.map((line, index) => <div key={index}>{line.quantity} × {line.name}</div>)}
      </div>
      {move && (
        // aria-disabled, not disabled: a disabled button would drop keyboard focus.
        <button className="btn small" aria-disabled={moving} onClick={() => { if (!moving) onMove(order, move.to); }} data-testid={`board-move-${order.number}`}>{move.label}</button>
      )}
    </div>
  );
}

function TableCard({ table, movingIds, onMove }) {
  return (
    <section className="table-card" data-testid={`board-table-${table.id}`}>
      <header>
        <h2>{table.label}</h2>
        <Link className="btn secondary small" to={`/staff/tables/${table.id}`} aria-label={`Open bill for ${table.label}`} data-testid={`board-open-bill-${table.id}`}>Open bill</Link>
      </header>
      {table.orders.length === 0 && <p className="muted">No orders</p>}
      {table.orders.map((order) => (
        <OrderCard key={order.id} order={order} moving={movingIds.includes(order.id)} onMove={onMove} />
      ))}
    </section>
  );
}

/** Contract C5's /staff: the Kitchen Board, BR1 to BR3. Reads only GET /api/tables, which starts no visit. */
export function KitchenBoardScreen() {
  const [tables, setTables] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [movingIds, setMovingIds] = useState([]);
  const [message, setMessage] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelButton = useRef(null);
  const everConnected = useRef(false);
  // The newest read wins. It keeps what changed after it started, and tables closed meanwhile.
  const reads = useRef({ latest: 0, changes: [], closedTableIds: [] });
  const closedVisitIds = useRef(new Set());
  // The panel shares this screen's stream rather than holding a second connection.
  const panelListener = useRef(null);

  const loadBoard = useCallback(async () => {
    const tracker = reads.current;
    const read = ++tracker.latest;
    tracker.changes = [];
    try {
      const board = await getBoard();
      if (read !== tracker.latest) return;
      tracker.closedTableIds = [];
      setTables(applyRead(board.tables, tracker.changes));
      setLoadFailed(false);
    } catch (error) {
      console.warn('The board could not be loaded.', error);
      if (read !== tracker.latest) return;
      setLoadFailed(true);
      const closed = tracker.closedTableIds;
      setTables((current) => current && clearTables(current, closed));
    }
  }, []);

  const applyChange = useCallback((order) => {
    // A replayed event for a closed visit must not bring its order back.
    if (closedVisitIds.current.has(order.visitId)) return;
    reads.current.changes.push(order);
    setTables((current) => current && mergeOrder(current, order));
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const { connected } = useLiveEvents({
    onOpen() {
      everConnected.current = true;
      loadBoard();
      panelListener.current?.('open');
    },
    onEvent(type, data) {
      panelListener.current?.(type, data);
      if (type === 'order.placed' || type === 'order.updated') applyChange(data.order);
      if (type === 'resync') loadBoard();
      if (type === 'table.closed') {
        reads.current.closedTableIds.push(data.tableId);
        if (data.visitId) closedVisitIds.current.add(data.visitId);
        loadBoard();
      }
    },
  });

  async function move(order, to) {
    setMovingIds((current) => [...current, order.id]);
    setMessage(null);
    try {
      applyChange(await moveOrder(order.id, order.status, to));
    } catch (error) {
      const status = error.details?.currentStatus;
      if (error.code === 'ORDER_STATE_CONFLICT' && status in STATUS_ICONS) {
        applyChange({ ...order, status });
        setMessage({ icon: status === 'Cancelled' ? '✕' : '⚠', text: moveRefusedMessage(order.number, status) });
      } else {
        console.warn('The order could not be moved.', error);
        setMessage({ icon: '⚠', kind: 'error', text: `We couldn't update Order #${order.number}. Please try again.` });
      }
    } finally {
      setMovingIds((current) => current.filter((id) => id !== order.id));
    }
  }

  function closePanel() {
    setPanelOpen(false);
    panelButton.current?.focus();
  }

  const reconnecting = everConnected.current && !connected;
  return (
    <>
      <StaffBar title="Kitchen Board">
        <LiveIndicator connected={connected} />
        <button className="btn secondary small" ref={panelButton} onClick={() => setPanelOpen(true)} aria-expanded={panelOpen} data-testid="availability-open">Menu availability</button>
      </StaffBar>
      {(reconnecting || loadFailed || message) && (
        <div className="board-notices">
          {reconnecting && (
            <div className="notice info" role="status" data-testid="board-reconnecting">
              <span aria-hidden="true">↻</span><span>Reconnecting… the board will catch up by itself.</span>
            </div>
          )}
          {loadFailed && (
            <>
              <div className="notice error" role="alert" data-testid="board-error">
                <span aria-hidden="true">⚠</span><span>We couldn't load the board.</span>
              </div>
              <button className="btn secondary" onClick={loadBoard} data-testid="board-error-retry">Try again</button>
            </>
          )}
          {message && (
            <div className={`notice ${message.kind ?? ''}`.trim()} role="alert" data-testid="board-message">
              <span aria-hidden="true">{message.icon}</span><span>{message.text}</span>
            </div>
          )}
        </div>
      )}
      {tables === null && !loadFailed && (
        <main className="board" data-testid="board-loading" aria-label="Loading">
          {Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}
        </main>
      )}
      {tables !== null && (
        <main className="board" data-testid="board">
          {tables.map((table) => <TableCard key={table.id} table={table} movingIds={movingIds} onMove={move} />)}
        </main>
      )}
      {panelOpen && <AvailabilityPanel onClose={closePanel} listenerRef={panelListener} />}
    </>
  );
}
