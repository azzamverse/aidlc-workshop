/**
 * The diner session passes its live events here, so the banner and the request
 * buttons follow the one stream a screen already has instead of opening their own.
 * Types are the stream's, plus `stream.open` for each new connection.
 */
const listeners = new Set();

export function publishDinerEvent(type, data) {
  listeners.forEach((listener) => listener(type, data));
}

export function subscribeDinerEvents(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
