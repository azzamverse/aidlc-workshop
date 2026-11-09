import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getBoard } from '../../shared/api.js';
import { useLiveEvents } from '../../shared/live.js';
import { getCartStore } from './cartStore.js';
import { decideEvent, decideVisitCheck, isReconnecting, isTabPress } from './sessionLogic.js';

const CHECK_RETRY_MS = 2000;
const CHECK_TRIES = 3;

// These outlive a screen: the live hook remounts with every tab. `restarts` holds,
// per table, the table object in use when a tab press asked for the next visit.
const restarts = new Map();
// `streamDown` carries a real outage across a tab press; a healthy new stream that is
// still opening is not one.
let streamDown = false;

/** The live cart state for a component. */
export function useCart(store) {
  return useSyncExternalStore(store.subscribe, store.getState);
}

/**
 * Everything the three diner screens share: the table, its cart, the live stream,
 * the reset when the table closes, and starting the next visit on a tab press.
 * `onEvent(type, data)` gets the events for the visit held. `onReload()` runs when
 * the screen opens, when a new visit starts and after each passed visit check.
 */
export function useDinerSession({ onEvent, onReload, onClosed }) {
  const { table, reloadTable } = useOutletContext();
  const cart = getCartStore(table.id);
  const [closed, setClosed] = useState(false);
  const isClosed = useRef(false);
  const retryTimer = useRef(null);
  const hasOpened = useRef(false);
  const latest = useRef(null);
  latest.current = { table, reloadTable, onEvent, onReload, onClosed };

  const markClosed = useCallback(() => {
    if (isClosed.current) return;
    isClosed.current = true;
    cart.clear();
    latest.current.onClosed?.();
    setClosed(true);
  }, [cart]);

  // BR6.2: only ever the board read here, which starts no visit.
  const checkVisit = useCallback(
    async (triesLeft = CHECK_TRIES) => {
      clearTimeout(retryTimer.current);
      const { table: held } = latest.current;
      const state = () => ({
        tableId: held.id,
        heldVisitId: held.visitId,
        closed: isClosed.current,
        restarting: restarts.has(held.id),
      });
      if (state().closed || state().restarting) return;
      let board;
      try {
        board = await getBoard();
      } catch (error) {
        console.warn('Could not check the table visit.', error);
        latest.current.onReload?.();
        if (triesLeft > 1) retryTimer.current = setTimeout(() => checkVisit(triesLeft - 1), CHECK_RETRY_MS);
        return;
      }
      if (latest.current.table.visitId !== held.visitId) return;
      const decision = decideVisitCheck({ ...state(), board });
      if (decision === 'close') markClosed();
      if (decision === 'reload') latest.current.onReload?.();
    },
    [markClosed],
  );

  const { connected } = useLiveEvents({
    tableId: table.id,
    onOpen() {
      hasOpened.current = true;
      checkVisit();
    },
    onEvent(type, data) {
      const decision = decideEvent({
        type,
        data,
        heldVisitId: latest.current.table.visitId,
        closed: isClosed.current,
        restarting: restarts.has(table.id),
      });
      if (decision === 'close') markClosed();
      if (decision === 'check') checkVisit();
      if (decision === 'deliver') latest.current.onEvent?.(type, data);
    },
  });

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  useEffect(() => {
    if (connected) streamDown = false;
    else if (hasOpened.current) streamDown = true;
  }, [connected]);

  // Before paint, so a cart from an earlier visit never shows.
  useLayoutEffect(() => {
    cart.openVisit(table.visitId);
  }, [cart, table.visitId]);

  // A new table object means the frame finished reading the table.
  useEffect(() => {
    const wasFrom = restarts.get(table.id);
    if (wasFrom && wasFrom !== table) {
      restarts.delete(table.id);
      isClosed.current = false;
      setClosed(false);
      checkVisit();
    }
    if (!isClosed.current) latest.current.onReload?.();
  }, [table, checkVisit]);

  // While closed, a press on any tab starts the next visit. It runs in the capture
  // phase, so it comes before the shell's NavLink replaces this screen.
  useEffect(() => {
    if (!closed) return undefined;
    function handlePress(event) {
      if (!isTabPress(event) || restarts.has(table.id)) return;
      restarts.set(table.id, table);
      reloadTable();
    }
    document.addEventListener('click', handlePress, true);
    return () => document.removeEventListener('click', handlePress, true);
  }, [closed, table, reloadTable]);

  return {
    table,
    cart,
    closed,
    markClosed,
    isClosed: () => isClosed.current,
    reconnecting: isReconnecting({ connected, everConnected: hasOpened.current || streamDown }),
  };
}
