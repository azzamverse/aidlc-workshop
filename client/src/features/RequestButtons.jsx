import { useCallback, useEffect, useRef, useState } from 'react';
import { createTableRequest, getTableRequests } from '../shared/api.js';
import { subscribeDinerEvents } from './dinerEvents.js';
import { applyRequestChange, dinerButtonText, kindsOf, REQUEST_KINDS } from './requests.js';

/** Call the waiter and Ask for the bill, for an Open visit only (BR5.1). */
export function RequestButtons({ table }) {
  const [waiting, setWaiting] = useState([]);
  const [noVisit, setNoVisit] = useState(false);
  const [message, setMessage] = useState(null);
  const lastRead = useRef(0);

  const read = useCallback(async () => {
    const reading = ++lastRead.current;
    try {
      const { requests } = await getTableRequests(table.id);
      if (reading === lastRead.current) setWaiting(kindsOf(requests));
    } catch (error) {
      console.warn('The table requests could not be read.', error);
    }
  }, [table.id]);

  useEffect(() => {
    setNoVisit(false);
    read();
    return subscribeDinerEvents((type, data) => {
      if (type === 'stream.open' || type === 'resync') read();
      if (type === 'table-request.updated') {
        lastRead.current += 1; // An older read still running must not undo this event.
        setWaiting((current) => applyRequestChange(current, data));
      }
    });
  }, [read, table.visitId]);

  async function ask(kind) {
    setMessage(null);
    try {
      await createTableRequest(table.id, kind);
      lastRead.current += 1;
      setWaiting((current) => applyRequestChange(current, { kind, status: 'waiting' }));
    } catch (error) {
      if (error.status === 409) {
        setNoVisit(true);
        return;
      }
      console.warn('The request could not be sent.', error);
      setMessage(`We couldn't reach the staff. Please try again.`);
    }
  }

  if (noVisit) return null;
  return (
    <>
      <div className="request-buttons">
        {REQUEST_KINDS.map((kind) => (
          <button className="btn secondary small" key={kind} onClick={() => ask(kind)} data-testid={`request-${kind}`}>
            {dinerButtonText(kind, waiting.includes(kind))}
          </button>
        ))}
      </div>
      {message && <div className="notice error" role="alert" data-testid="request-message"><span aria-hidden="true">⚠</span><span>{message}</span></div>}
    </>
  );
}
