import { useCallback, useEffect, useRef, useState } from 'react';
import { getTableOrders } from '../shared/api.js';
import { announce } from './alerts.js';
import { subscribeDinerEvents } from './dinerEvents.js';
import { bannerFor, dismissOrders, emptyState, observeOrders, readState, saveState } from './notifications.js';
import './features.css';

function deviceStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
}

/**
 * The order-ready banner on every diner screen. Each page keeps its own memory, so
 * two open tabs of one browser both announce; the saved copy serves the next load.
 */
export function ReadyBanner({ table }) {
  const [banners, setBanners] = useState([]);
  const memory = useRef(emptyState(table.visitId));

  const observe = useCallback((orders) => {
    const { state, ready } = observeOrders(memory.current, table.visitId, orders);
    memory.current = state;
    saveState(deviceStorage(), table.id, state);
    if (ready.length === 0) return;
    const banner = bannerFor(ready);
    setBanners((current) => [...current, banner]);
    announce('diner');
  }, [table.id, table.visitId]);

  const read = useCallback(async () => {
    try {
      const { orders } = await getTableOrders(table.id);
      observe(orders);
    } catch (error) {
      console.warn('The orders could not be checked for the banner.', error);
    }
  }, [table.id, observe]);

  useEffect(() => {
    memory.current = readState(deviceStorage(), table.id, table.visitId);
    setBanners([]);
    read();
    return subscribeDinerEvents((type, data) => {
      if (type === 'stream.open' || type === 'resync') read();
      if (type === 'order.placed' || type === 'order.updated') observe([data.order]);
      if (type === 'table.closed') setBanners([]);
    });
  }, [table.id, table.visitId, read, observe]);

  function dismiss(banner) {
    memory.current = dismissOrders(memory.current, banner.orderIds);
    saveState(deviceStorage(), table.id, memory.current);
    setBanners((current) => current.filter((candidate) => candidate !== banner));
  }

  if (banners.length === 0) return null;
  return (
    <div className="banners">
      {banners.map((banner) => (
        <div className="banner" role="status" key={banner.orderIds.join()} data-testid="ready-banner">
          <span>{banner.text}</span>
          <button className="banner-dismiss" onClick={() => dismiss(banner)} data-testid="ready-banner-dismiss">Dismiss</button>
        </div>
      ))}
    </div>
  );
}
