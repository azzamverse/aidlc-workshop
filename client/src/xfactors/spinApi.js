import { ApiError } from '../shared/api.js';

const REQUEST_TIMEOUT_MS = 5000;

async function send(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (cause) {
    throw new ApiError('We could not reach the server.', { cause });
  }
  const body = await response.json().catch(() => null);
  if (response.ok) return body;
  const { code = null, message = 'Something went wrong. Please try again.' } = body?.error ?? {};
  throw new ApiError(message, { status: response.status, code });
}

const spinPath = (tableId) => `/api/tables/${encodeURIComponent(tableId)}/spin`;

/** C16: the running spin, or null. */
export const getSpin = (tableId) => send(spinPath(tableId));

/** C16: starts a spin; the server chooses the seat. */
export const startSpin = (tableId, { question, seats }) =>
  send(spinPath(tableId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, seats }),
  });
