import { useMemo } from 'react';
import { STATIONS, ticketsAtStation, ticketsFromOrders } from './logic/tickets.js';
import { SceneHost } from './SceneHost.jsx';
import { buildKitchenScene } from './scenes/kitchenScene.js';

/** C14: Kitchen Theatre (US10.1), this table's orders as tickets on a rail. */
export default function KitchenTheatre({ orders }) {
  const tickets = useMemo(() => ticketsFromOrders(orders), [orders]);
  const sceneData = useMemo(() => ({ tickets }), [tickets]);

  return (
    <section className="xf" data-testid="slot-kitchen-theatre">
      <h2>Kitchen Theatre</h2>
      <SceneHost build={buildKitchenScene} data={sceneData} label="Your orders on the kitchen rail" testId="kitchen-stage" short />
      <ol className="xf-stations" data-testid="kitchen-stations">
        {STATIONS.map((station) => (
          <li className="xf-station" key={station.id} data-testid={`kitchen-station-${station.id}`}>
            <span className="xf-station-name">{station.label}</span>
            <ul className="xf-tickets">
              {ticketsAtStation(tickets, station.id).map((ticket) => (
                <li className="xf-ticket" key={ticket.orderNumber} data-testid={`kitchen-ticket-${ticket.orderNumber}`}>#{ticket.orderNumber} {ticket.status}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="muted">Only your table's orders are shown.</p>
    </section>
  );
}
