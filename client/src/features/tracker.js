/** The order tracker's decisions, with no React in it (BR6.1, BR6.2). */

const STEP = { Pending: 1, Preparing: 2, Completed: 3 };
export const STEP_COUNT = 3;

/** How many of the three segments are filled; null means no bar (Cancelled). */
export const filledSteps = (status) => STEP[status] ?? null;

const isOpen = (order) => order.status === 'Pending' || order.status === 'Preparing';

/** "About N min" for an open order that has an estimate; otherwise null. */
export const estimateText = (order) =>
  isOpen(order) && Number.isInteger(order.estimateMinutes) ? `About ${order.estimateMinutes} min` : null;

/** Live events carry no estimate, so an open order keeps its last one until the re-read. */
export function withKnownEstimate(orders, incoming) {
  const known = orders?.find((order) => order.id === incoming.id)?.estimateMinutes;
  return isOpen(incoming) && known !== undefined ? { ...incoming, estimateMinutes: known } : incoming;
}
