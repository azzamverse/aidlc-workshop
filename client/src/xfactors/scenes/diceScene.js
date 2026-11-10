import { createStage, createTextTexture } from './stage.js';

const FACES = ['1', '2', '3', '4', '5', '6'];
const TURN_PER_MS = 0.012;

function createDie(THREE, x) {
  const materials = FACES.map((face) => new THREE.MeshBasicMaterial({ map: createTextTexture(THREE, [face]) }));
  const die = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), materials);
  die.position.x = x;
  die.rotation.set(0.5, 0.6, 0);
  return die;
}

/** Chef's Dice: two dice that tumble while a roll is running. */
export function buildDiceScene(THREE, { container, onFail }) {
  const stage = createStage(THREE, { container, onFail, cameraPosition: [0, 0.6, 5.6] });
  const dice = [createDie(THREE, -1.25), createDie(THREE, 1.25)];
  stage.scene.add(...dice);
  let isRolling = false;
  let lastMs = null;

  return {
    update({ rolling }) {
      isRolling = rolling;
      lastMs = null;
    },
    tick(timeMs) {
      if (!isRolling) return;
      const step = lastMs === null ? 0 : (timeMs - lastMs) * TURN_PER_MS;
      lastMs = timeMs;
      dice.forEach((die, index) => {
        die.rotation.x += step * (index + 1);
        die.rotation.y += step * 0.7;
      });
    },
    render: stage.render,
    dispose: stage.dispose,
  };
}
