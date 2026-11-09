const REQUEST_TIMEOUT_MS = 5000;

/** A failed request. `isNetworkError` means no answer came, so the outcome is unknown. */
export class ApiError extends Error {
  constructor(message, { status = null, code = null, details = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = status === null;
  }
}

async function readRefusal(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Not the shared error shape (a proxy page, say); the fallback message below applies.
  }
  const { code = null, message = 'Something went wrong. Please try again.', ...details } = body?.error ?? {};
  return new ApiError(message, { status: response.status, code, details });
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError('We could not reach the server.', { cause });
  }
  if (!response.ok) throw await readRefusal(response);
  return response.json();
}

/** A unique placement key. Works on plain http, where crypto.randomUUID does not exist. */
export function newPlacementKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const getMenu = () => request('/api/menu');
export const getTable = (tableId) => request(`/api/tables/${encodeURIComponent(tableId)}`);
export const getTableOrders = (tableId) => request(`/api/tables/${encodeURIComponent(tableId)}/orders`);
export const getBoard = () => request('/api/tables');

/**
 * Places an order: { visitId, placementKey, lines }. Only this call retries by
 * itself, once when no answer came: the placement key makes the repeat safe.
 */
export async function placeOrder(tableId, placement) {
  const send = () => request(`/api/tables/${encodeURIComponent(tableId)}/orders`, { method: 'POST', body: placement });
  try {
    return await send();
  } catch (error) {
    if (!error.isNetworkError) throw error;
    return send();
  }
}

export const getBill = (tableId) => request(`/api/tables/${encodeURIComponent(tableId)}/bill`);
export const closeTable = (tableId) => request(`/api/tables/${encodeURIComponent(tableId)}/close`, { method: 'POST' });

export const cancelOrder =(tableId, orderId) =>
  request(`/api/tables/${encodeURIComponent(tableId)}/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' });

export const moveOrder = (orderId, from, to) =>
  request(`/api/orders/${encodeURIComponent(orderId)}/status`, { method: 'PUT', body: { from, to } });

export const setItemSoldOut = (itemId, soldOut) =>
  request(`/api/menu/items/${encodeURIComponent(itemId)}/sold-out`, { method: 'PUT', body: { soldOut } });
