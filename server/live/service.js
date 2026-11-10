export const KEEP_ALIVE_MS = 25_000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function formatFrame(sequence, type, data) {
  return `id: ${sequence}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function formatEvent(event) {
  const data = { sequence: event.sequence, tableId: event.tableId, ...event.payload };
  return formatFrame(event.sequence, event.type, data);
}

// C12: the only events with no table; neither carries order or bill data.
const NO_TABLE_EVENT_TYPES = new Set(['menu.item-updated', 'queue.changed']);

/** BR2.2: a table's stream gets its own events and the no-table ones; replay uses this too. */
const isForClient = (event, client) =>
  client.tableId === null || event.tableId === client.tableId || NO_TABLE_EVENT_TYPES.has(event.type);

/**
 * Publishes events and keeps open streams up to date. An event is stored inside
 * the caller's transaction, so it rolls back with the change, and is sent only
 * after the commit.
 */
export function createLiveService({ repo, transactions, log, now = Date.now }) {
  const clients = new Set();
  const timers = [];

  function sendToClient(client, frame) {
    try {
      client.send(frame);
    } catch (error) {
      clients.delete(client);
      log.error('Could not write to a live stream; dropping it', error);
    }
  }

  function broadcast(event) {
    const frame = formatEvent(event);
    for (const client of clients) {
      if (isForClient(event, client)) sendToClient(client, frame);
    }
  }

  /** C4: queues an event for after the commit, joining the open transaction if any. */
  function publishEvent({ type, tableId = null, ...payload }) {
    return transactions.withTransaction(() => {
      const createdAt = new Date(now()).toISOString();
      const event = repo.insert({ type, tableId, payload, createdAt });
      transactions.afterCommit(() => broadcast(event));
      return event.sequence;
    });
  }

  /** True when the events after `sequence` can no longer all be replayed. */
  function isOutsideReplayWindow(sequence) {
    const latest = repo.latestSequence();
    if (sequence > latest) return true;
    if (sequence === latest) return false;
    const first = repo.findFirstAfter(sequence);
    if (!first || first.sequence !== sequence + 1) return true;
    return Date.parse(first.createdAt) < now() - ONE_HOUR_MS;
  }

  function replay(client, lastEventId) {
    if (isOutsideReplayWindow(lastEventId)) {
      const latest = repo.latestSequence();
      sendToClient(client, formatFrame(latest, 'resync', { sequence: latest }));
      return;
    }
    for (const event of repo.listAfter(lastEventId)) {
      if (isForClient(event, client)) sendToClient(client, formatEvent(event));
    }
  }

  /**
   * Opens a stream for `send(frame)`. Returns the function that closes it.
   * A first connection is told the latest sequence, so if it drops before any
   * event reached it the browser still reports where it was and catches up.
   */
  function subscribe({ tableId = null, lastEventId = null, send }) {
    const client = { tableId, send };
    clients.add(client);
    if (lastEventId === null) {
      sendToClient(client, `id: ${repo.latestSequence()}\n\n`);
    } else {
      replay(client, lastEventId);
    }
    return () => clients.delete(client);
  }

  function sendKeepAlive() {
    for (const client of clients) sendToClient(client, ': keep-alive\n\n');
  }

  function pruneOldEvents() {
    try {
      return repo.deleteOlderThan(new Date(now() - ONE_HOUR_MS).toISOString());
    } catch (error) {
      log.error('Could not delete old live events', error);
      return 0;
    }
  }

  function start() {
    pruneOldEvents();
    timers.push(setInterval(sendKeepAlive, KEEP_ALIVE_MS), setInterval(pruneOldEvents, ONE_HOUR_MS));
    timers.forEach((timer) => timer.unref());
  }

  function stop() {
    timers.splice(0).forEach(clearInterval);
    clients.clear();
  }

  return { publishEvent, subscribe, sendKeepAlive, pruneOldEvents, start, stop };
}
