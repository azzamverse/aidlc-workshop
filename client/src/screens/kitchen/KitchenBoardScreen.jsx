import { useCallback, useEffect, useState } from 'react';
import { getBoard } from '../../shared/api.js';
import { useLiveEvents } from '../../shared/live.js';
import { LiveIndicator, StaffBar } from '../../shell/StaffFrame.jsx';

function withOrder(tables, order) {
  return tables.map((table) => {
    if (table.id !== order.tableId) return table;
    const others = table.orders.filter((existing) => existing.id !== order.id);
    return { ...table, orders: [...others, order].sort((a, b) => b.number - a.number) };
  });
}

/**
 * TODO(U3): the walking skeleton's plain page, kept deliberately simple so it
 * proves an order arrives live. U3 replaces this file with the real board.
 */
export function KitchenBoardScreen() {
  const [tables, setTables] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadBoard = useCallback(async () => {
    try {
      setTables((await getBoard()).tables);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const { connected } = useLiveEvents({
    onOpen: loadBoard,
    onEvent: (type, data) => {
      if (type === 'resync' || type === 'table.closed') loadBoard();
      if (type === 'order.placed' || type === 'order.updated') setTables((current) => withOrder(current, data.order));
    },
  });

  return (
    <>
      <StaffBar title="Kitchen Board"><LiveIndicator connected={connected} /></StaffBar>
      {loadFailed && (
        <div className="notice error" role="alert" data-testid="board-error">
          <span aria-hidden="true">⚠</span>
          <span>We couldn't load the board.</span>
          <button className="link-btn" onClick={loadBoard} data-testid="board-error-retry">Try again</button>
        </div>
      )}
      <main className="board" data-testid="board">
        {tables.map((table) => (
          <section className="table-card" key={table.id} data-testid={`board-table-${table.id}`}>
            <header><h2>{table.label}</h2></header>
            {table.orders.length === 0 && <p className="muted">No orders</p>}
            {table.orders.map((order) => (
              <div className="order" key={order.id} data-testid={`board-order-${order.number}`}>
                <div className="order-title"><span>#{order.number}</span><span>{order.status}</span></div>
                <div className="muted">
                  {order.lines.map((line) => <div key={line.name}>{line.quantity} × {line.name}</div>)}
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}
