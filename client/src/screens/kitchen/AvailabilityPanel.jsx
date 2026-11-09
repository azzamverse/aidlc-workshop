import { useCallback, useEffect, useRef, useState } from 'react';
import { getMenu, setItemSoldOut } from '../../shared/api.js';

const withMark = (items, itemId, soldOut) =>
  items.map((item) => (item.id === itemId ? { ...item, soldOut } : item));

/** BR4: the Sold out switches. Mounted only while open; a side panel, not a modal dialog, so the board stays usable. */
export function AvailabilityPanel({ onClose, listenerRef }) {
  const [items, setItems] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState(null);
  const closeButton = useRef(null);
  const reads = useRef({ latest: 0, changes: [] });

  const load = useCallback(async () => {
    const tracker = reads.current;
    const read = ++tracker.latest;
    tracker.changes = [];
    try {
      const menu = await getMenu();
      if (read !== tracker.latest) return;
      // A mark saved after this read started stays as it is.
      setItems(
        tracker.changes.reduce(
          (current, change) => withMark(current, change.id, change.soldOut),
          menu.categories.flatMap((category) => category.items),
        ),
      );
      setLoadFailed(false);
    } catch (error) {
      console.warn('The menu could not be loaded.', error);
      if (read === tracker.latest) setLoadFailed(true);
    }
  }, []);

  const applyMark = useCallback((change) => {
    reads.current.changes.push(change);
    setItems((current) => current && withMark(current, change.id, change.soldOut));
  }, []);

  useEffect(() => {
    load();
    closeButton.current?.focus();
  }, [load]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // The board passes its stream's events here.
  useEffect(() => {
    listenerRef.current = (type, data) => {
      if (type === 'menu.item-updated') applyMark(data.item);
      if (type === 'resync' || type === 'open') load();
    };
    return () => {
      listenerRef.current = null;
    };
  }, [listenerRef, load, applyMark]);

  async function save(item, soldOut) {
    setSaving((current) => ({ ...current, [item.id]: soldOut }));
    setMessage(null);
    try {
      const saved = await setItemSoldOut(item.id, soldOut);
      applyMark({ id: item.id, soldOut: saved.soldOut });
    } catch (error) {
      console.warn('The mark could not be saved.', error);
      setMessage("We couldn't save that change. Please try again.");
    } finally {
      setSaving(({ [item.id]: _done, ...rest }) => rest);
    }
  }

  return (
    <aside className="panel open" aria-label="Menu availability" data-testid="availability-panel">
      <div className="order-head">
        <h2>Menu availability</h2>
        <button className="btn secondary small" ref={closeButton} onClick={onClose} data-testid="availability-close">Close</button>
      </div>
      <p className="muted">Mark an item sold out and diners see it straight away.</p>
      {message && (
        <div className="notice error" role="alert" data-testid="availability-message">
          <span aria-hidden="true">⚠</span><span>{message}</span>
        </div>
      )}
      {items === null && !loadFailed && <div className="skeleton" data-testid="availability-loading" />}
      {loadFailed && (
        <>
          <div className="notice error" role="alert" data-testid="availability-error">
            <span aria-hidden="true">⚠</span><span>We couldn't load the menu. Please try again.</span>
          </div>
          <button className="btn secondary" onClick={load} data-testid="availability-retry">Try again</button>
        </>
      )}
      {items?.map((item) => (
        <div className="switch-row" key={item.id} data-testid={`availability-row-${item.id}`}>
          <span>{item.name}</span>
          <label>
            <input
              type="checkbox"
              aria-label={`${item.name} sold out`}
              checked={saving[item.id] ?? item.soldOut}
              // aria-disabled, not disabled: a disabled control would drop keyboard focus.
              aria-disabled={item.id in saving}
              onChange={(event) => {
                if (!(item.id in saving)) save(item, event.target.checked);
              }}
              data-testid={`availability-switch-${item.id}`}
            />
            Sold out
          </label>
        </div>
      ))}
    </aside>
  );
}
