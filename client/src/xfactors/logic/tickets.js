const STATION_OF_STATUS = { Pending: 'rail-start', Preparing: 'stove', Completed: 'pass' };

/** The three stations, left to right, with the words the mockup shows. */
export const STATIONS = [
  { id: 'rail-start', label: 'The rail' },
  { id: 'stove', label: '🔥 The stove' },
  { id: 'pass', label: '🛎 The pass' },
];

/** BR10.1 and BR10.2: one ticket per non-Cancelled order, oldest first. */
export function ticketsFromOrders(orders) {
  return [...orders]
    .filter((order) => order.status !== 'Cancelled')
    .sort((a, b) => a.number - b.number)
    .map((order) => ({ orderNumber: order.number, status: order.status, station: STATION_OF_STATUS[order.status] }));
}

export const ticketsAtStation = (tickets, stationId) => tickets.filter((ticket) => ticket.station === stationId);
