import { beforeEach, describe, expect, it, vi } from 'vitest';

const added = [];
vi.mock('../../client/src/xfactors/scenes/stage.js', () => ({
  createStage: () => ({ scene: { add: (...objects) => added.push(...objects) }, render() {}, dispose() {} }),
  clearGroup: (group) => {
    group.children.length = 0;
  },
  createTextTexture: () => ({}),
}));

const { buildBottleScene } = await import('../../client/src/xfactors/scenes/bottleScene.js');

class FakeObject {
  children = [];
  rotation = { x: 0, y: 0, z: 0 };
  position = { x: 0, y: 0, z: 0, set() {} };
  add(...objects) {
    this.children.push(...objects);
  }
}

const FakeThree = {
  Group: FakeObject,
  Mesh: FakeObject,
  CylinderGeometry: class {},
  CircleGeometry: class {},
  MeshStandardMaterial: class {},
  MeshBasicMaterial: class {},
};

const SEATS = 4;
const quarterTurn = Math.PI / 2;
const spin = (spinKey, phase, resultSeat = 2) => ({ seats: SEATS, phase, spinKey, resultSeat, durationMs: 1000 });

describe('the bottle scene', () => {
  let scene;
  let bottle;
  const finish = () => scene.tick(performance.now() + 2000);
  const halfway = () => scene.tick(performance.now() + 500);

  beforeEach(() => {
    added.length = 0;
    scene = buildBottleScene(FakeThree, { container: {}, onFail() {} });
    [, bottle] = added;
    scene.update(spin(null, 'idle'));
  });

  it('regression: the bottle animates when the phase turns spinning after the new spin id arrived first', () => {
    scene.update(spin('a', 'pending'));
    scene.update(spin('a', 'spinning'));
    halfway();
    expect(bottle.rotation.y).toBeGreaterThan(Math.PI * 2);
  });

  it('holds still while a new spin is only pending', () => {
    scene.update(spin('a', 'pending'));
    finish();
    expect(bottle.rotation.y).toBe(0);
  });

  it('ends at the result seat after whole turns', () => {
    scene.update(spin('a', 'spinning', 3));
    finish();
    expect(bottle.rotation.y % (Math.PI * 2)).toBeCloseTo(2 * quarterTurn);
  });

  it('settles on the seat when the result arrives', () => {
    scene.update(spin('a', 'spinning', 3));
    scene.update(spin('a', 'result', 3));
    expect(bottle.rotation.y).toBeCloseTo(2 * quarterTurn);
    finish();
    expect(bottle.rotation.y).toBeCloseTo(2 * quarterTurn);
  });

  it('jumps straight to the seat where a spin has no animation', () => {
    scene.update(spin('a', 'result', 4));
    expect(bottle.rotation.y).toBeCloseTo(3 * quarterTurn);
  });

  it('a second spin does not move to its seat until it has spun', () => {
    scene.update(spin('a', 'spinning', 2));
    scene.update(spin('a', 'result', 2));
    scene.update(spin('b', 'pending', 4));
    expect(bottle.rotation.y).toBeCloseTo(quarterTurn);
    scene.update(spin('b', 'spinning', 4));
    halfway();
    expect(bottle.rotation.y).toBeGreaterThan(Math.PI * 2);
  });

  it('does not restart a spin it is already running', () => {
    scene.update(spin('a', 'spinning'));
    finish();
    const finished = bottle.rotation.y;
    scene.update(spin('a', 'spinning'));
    finish();
    expect(bottle.rotation.y).toBeCloseTo(finished);
  });
});
