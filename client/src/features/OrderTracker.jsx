import { estimateText, filledSteps, STEP_COUNT } from './tracker.js';

const SEGMENTS = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

/** The bar and the wait on a My orders card; the card's status chip names the step in words. */
export function OrderTracker({ order }) {
  const filled = filledSteps(order.status);
  if (filled === null) return null;
  const estimate = estimateText(order);
  return (
    <div className="tracker" data-testid={`order-tracker-${order.number}`}>
      <div className="track" role="img" aria-label={`Step ${filled} of ${STEP_COUNT}: ${order.status}`}>
        {SEGMENTS.map((segment) => <div key={segment} className={segment <= filled ? 'seg on' : 'seg'} />)}
      </div>
      {estimate && <span className="estimate" data-testid={`order-estimate-${order.number}`}>{estimate}</span>}
    </div>
  );
}
