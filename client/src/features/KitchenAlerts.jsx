import { useEffect, useRef, useState } from 'react';
import { announce } from './alerts.js';
import { newOrderAlert } from './requests.js';

const ALERT_MS = 8000;

/** New-order alerts, stacked; each goes after 8 seconds or when dismissed (BR1.6). */
export function KitchenAlerts({ tables, listenerRef }) {
  const [alerts, setAlerts] = useState([]);
  const seen = useRef(new Set());
  const timers = useRef(new Map());
  const latestTables = useRef(tables);
  latestTables.current = tables;

  function dismiss(alertId) {
    clearTimeout(timers.current.get(alertId));
    timers.current.delete(alertId);
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
  }

  useEffect(() => {
    listenerRef.current = (type, data) => {
      if (type !== 'order.placed') return;
      const alert = newOrderAlert(seen.current, data.order, latestTables.current);
      if (!alert) return;
      setAlerts((current) => [...current, alert]);
      timers.current.set(alert.id, setTimeout(() => dismiss(alert.id), ALERT_MS));
      announce('kitchen');
    };
    const running = timers.current;
    return () => {
      listenerRef.current = null;
      running.forEach(clearTimeout);
      running.clear();
    };
  }, [listenerRef]);

  if (alerts.length === 0) return null;
  return (
    <div className="kitchen-alerts">
      {alerts.map((alert) => (
        <div className="kitchen-alert" role="status" key={alert.id} data-testid={`kitchen-alert-${alert.number}`}>
          <span>{alert.text}</span>
          <button className="btn secondary small" onClick={() => dismiss(alert.id)} data-testid={`kitchen-alert-dismiss-${alert.number}`}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}
