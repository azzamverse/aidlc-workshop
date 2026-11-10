import { clearGroup, createStage, createTextTexture } from './stage.js';

const SEAT_RING = 3;
const TURNS = 5;

const seatAngle = (seat, seats) => ((seat - 1) / seats) * Math.PI * 2;
const easeOut = (progress) => 1 - (1 - progress) ** 3;

function createBottle(THREE) {
  const glass = new THREE.MeshStandardMaterial({ color: 0x2f8a5f, roughness: 0.25, metalness: 0.1 });
  const bottle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 20), glass);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.5;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 1.2, 16), glass);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 1.2;
  bottle.add(body, neck);
  bottle.position.y = 0.45;
  return bottle;
}

function createSeat(THREE, number, angle) {
  const texture = createTextTexture(THREE, [String(number)], { background: '#3d2750', color: '#f6d999' });
  const seat = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ map: texture }));
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(Math.sin(angle) * SEAT_RING, 0.02, Math.cos(angle) * SEAT_RING);
  return seat;
}

/** Spin the Bottle: turns to the server's seat over the time left on this screen. */
export function buildBottleScene(THREE, { container, onFail }) {
  const stage = createStage(THREE, { container, onFail, cameraPosition: [0, 8, 5.2] });
  const seatsGroup = new THREE.Group();
  const bottle = createBottle(THREE);
  stage.scene.add(seatsGroup, bottle);
  let shownSeats = 0;
  let animatedKey = null;
  let animation = null;

  function showSeats(seats) {
    clearGroup(seatsGroup);
    for (let seat = 1; seat <= seats; seat += 1) seatsGroup.add(createSeat(THREE, seat, seatAngle(seat, seats)));
    shownSeats = seats;
  }

  function startAnimation({ seats, resultSeat, durationMs }) {
    animation = {
      startMs: performance.now(),
      durationMs,
      fromAngle: bottle.rotation.y % (Math.PI * 2),
      toAngle: seatAngle(resultSeat, seats) + TURNS * Math.PI * 2,
    };
  }

  return {
    update({ seats, phase, spinKey, resultSeat, durationMs }) {
      if (seats !== shownSeats) showSeats(seats);
      if (phase === 'spinning' && spinKey !== animatedKey) {
        animatedKey = spinKey;
        startAnimation({ seats, resultSeat, durationMs });
      }
      if (phase === 'idle') animation = null;
      if (phase === 'result') {
        animation = null;
        bottle.rotation.y = seatAngle(resultSeat, seats);
      }
    },
    tick(timeMs) {
      if (!animation) return;
      const progress = Math.min(1, (timeMs - animation.startMs) / animation.durationMs);
      bottle.rotation.y = animation.fromAngle + (animation.toAngle - animation.fromAngle) * easeOut(Math.max(0, progress));
    },
    render: stage.render,
    dispose: stage.dispose,
  };
}
