import { boardRequestText } from './requests.js';

/** One card's waiting requests in words, each with its own Respond (BR5.3, BR5.4). */
export function RequestStrip({ table, requests, respondingIds, onRespond }) {
  if (requests.length === 0) return null;
  return (
    <div className="request-strip" data-testid={`board-requests-${table.id}`}>
      {requests.map((request) => {
        const words = boardRequestText(request.kind);
        return (
          <p key={request.id} data-testid={`board-request-${table.id}-${request.kind}`}>
            <span>{words}</span>
            <button
              className="btn small"
              aria-label={`Respond: ${words}, ${table.label}`}
              aria-disabled={respondingIds.includes(request.id)}
              onClick={() => { if (!respondingIds.includes(request.id)) onRespond(request); }}
              data-testid={`board-respond-${table.id}-${request.kind}`}
            >
              Respond
            </button>
          </p>
        );
      })}
    </div>
  );
}
