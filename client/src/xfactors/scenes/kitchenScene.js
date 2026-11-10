import { STATIONS, ticketsAtStation } from '../logic/tickets.js';
import { clearGroup, createStage, createTextTexture } from './stage.js';

const STATION_SPACING = 3.1;
const STATION_COLORS = { 'rail-start': 0x5a3a72, stove: 0xff7a4d, pass: 0x8fd9a8 };
const TICKET_DROP = 0.5;

const stationX = (index) => (index - 1) * STATION_SPACING;

function addFixedParts(THREE, scene) {
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xe8b75a, metalness: 0.4, roughness: 0.4 }),
  );
  rail.position.y = 2;
  scene.add(rail);
  STATIONS.forEach((station, index) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.7, 1.4),
      new THREE.MeshStandardMaterial({ color: STATION_COLORS[station.id] }),
    );
    block.position.set(stationX(index), -2.2, 0);
    scene.add(block);
  });
}

function createTicket(THREE, ticket) {
  const texture = createTextTexture(THREE, [`#${ticket.orderNumber}`, ticket.status]);
  return new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: texture }));
}

/** Kitchen Theatre: each order's ticket at the station of its status (BR10.1, BR10.2). */
export function buildKitchenScene(THREE, { container, onFail }) {
  const stage = createStage(THREE, { container, onFail, cameraPosition: [0, 0.2, 7.6] });
  addFixedParts(THREE, stage.scene);
  const ticketsGroup = new THREE.Group();
  stage.scene.add(ticketsGroup);
  let shownTickets = null;

  function showTickets(tickets) {
    clearGroup(ticketsGroup);
    STATIONS.forEach((station, stationIndex) => {
      ticketsAtStation(tickets, station.id).forEach((ticket, index) => {
        const mesh = createTicket(THREE, ticket);
        mesh.position.set(stationX(stationIndex), 1.3 - index * TICKET_DROP, 0.05 * index);
        mesh.rotation.z = -0.05;
        ticketsGroup.add(mesh);
      });
    });
    shownTickets = tickets;
  }

  return {
    update({ tickets }) {
      if (tickets !== shownTickets) showTickets(tickets);
    },
    tick() {},
    render: stage.render,
    dispose: stage.dispose,
  };
}
