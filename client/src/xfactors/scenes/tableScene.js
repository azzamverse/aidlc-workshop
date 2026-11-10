import { clearGroup, createStage } from './stage.js';

const PLATE_RING = 2.1;
const STEAM_PUFFS = 3;
const STEAM_RISE = 0.9;
const ROOMY_PLATE_COUNT = 8;
const ROOMY_PLATE_SCALE = 1.6;

function addPlateBody(THREE, group) {
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.34, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xfbf1df }),
  );
  plate.position.y = 0.04;
  group.add(plate);
}

function addCover(THREE, group) {
  const cover = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe8b75a, metalness: 0.5, roughness: 0.35 }),
  );
  cover.position.y = 0.08;
  group.add(cover);
}

function addFood(THREE, group) {
  const food = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xc8643c }),
  );
  food.scale.y = 0.55;
  food.position.y = 0.16;
  group.add(food);
}

function addSteam(THREE, group, puffs) {
  for (let index = 0; index < STEAM_PUFFS; index += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    puff.position.set((index - 1) * 0.14, 0.35 + index * 0.25, 0);
    puff.userData.phase = index / STEAM_PUFFS;
    group.add(puff);
    puffs.push(puff);
  }
}

function createPlateGroup(THREE, plate, puffs) {
  const group = new THREE.Group();
  addPlateBody(THREE, group);
  if (plate.state === 'covered') addCover(THREE, group);
  if (plate.state !== 'covered') addFood(THREE, group);
  if (plate.state === 'steaming') addSteam(THREE, group, puffs);
  return group;
}

/** The Living Table: the plates of BR9.1 in the states of BR9.2, turned by BR9.3. */
export function buildTableScene(THREE, { container, onFail }) {
  const stage = createStage(THREE, { container, onFail, cameraPosition: [0, 6.4, 6.2] });
  const turntable = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x6b3f25, roughness: 0.6 }),
  );
  top.position.y = -0.1;
  turntable.add(top);
  const platesGroup = new THREE.Group();
  turntable.add(platesGroup);
  stage.scene.add(turntable);

  let shownPlates = null;
  let puffs = [];

  function showPlates(plates) {
    clearGroup(platesGroup);
    puffs = [];
    plates.forEach((plate, index) => {
      const angle = (index / plates.length) * Math.PI * 2;
      const group = createPlateGroup(THREE, plate, puffs);
      group.position.set(Math.sin(angle) * PLATE_RING, 0, Math.cos(angle) * PLATE_RING);
      // Larger when there is room; a full table of 12 keeps them from overlapping.
      group.scale.setScalar(plates.length <= ROOMY_PLATE_COUNT ? ROOMY_PLATE_SCALE : 1);
      platesGroup.add(group);
    });
    shownPlates = plates;
  }

  return {
    update({ plates, rotation }) {
      if (plates !== shownPlates) showPlates(plates);
      turntable.rotation.y = rotation;
    },
    tick(timeMs) {
      for (const puff of puffs) {
        const progress = (timeMs / 1600 + puff.userData.phase) % 1;
        puff.position.y = 0.3 + progress * STEAM_RISE;
        puff.material.opacity = 0.6 * (1 - progress);
      }
    },
    render: stage.render,
    dispose: stage.dispose,
  };
}
