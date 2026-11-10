import { describe, expect, it, vi } from 'vitest';
import { isShake, MOODS, NO_MATCH_MESSAGE, pickDish, qualifyingDishes, suggestionReason } from '../../client/src/xfactors/logic/dice.js';
import { PLATE_CAP, plateWord, platesFromOrders, rotationAfterDrag, rotationAfterKey, turnedDegrees } from '../../client/src/xfactors/logic/plates.js';
import { clampSeats, phaseForSpin, remainingMs, resultSentence, SPIN_DURATION_MS } from '../../client/src/xfactors/logic/spinTime.js';
import { isWebGLAvailable, prefersReducedMotion } from '../../client/src/xfactors/logic/support.js';
import { STATIONS, ticketsAtStation, ticketsFromOrders } from '../../client/src/xfactors/logic/tickets.js';

const orderOf = (number, status, lines = [{ name: 'Coffee', quantity: 1 }]) => ({ id: `order-${number}`, number, status, lines });

describe('plates', () => {
  it('shows one plate per unit, in the order the dishes were placed', () => {
    const { plates } = platesFromOrders([orderOf(2, 'Pending'), orderOf(1, 'Pending', [{ name: 'Pizza', quantity: 2 }])]);
    expect(plates.map((plate) => plate.dishName)).toEqual(['Pizza', 'Pizza', 'Coffee']);
  });

  it('leaves out Cancelled orders', () => {
    expect(platesFromOrders([orderOf(1, 'Cancelled')]).units).toEqual([]);
  });

  it.each([
    ['Pending', 'covered', 'Waiting'],
    ['Preparing', 'steaming', 'Cooking'],
    ['Completed', 'uncovered', 'Ready'],
  ])('maps %s to %s, in words %s', (status, state, word) => {
    const [plate] = platesFromOrders([orderOf(1, status)]).plates;
    expect(plate.state).toBe(state);
    expect(plateWord(plate.state)).toBe(word);
  });

  it(`caps the drawn plates at ${PLATE_CAP}, counts the rest, and keeps every unit in the summary`, () => {
    const { plates, units, hiddenCount } = platesFromOrders([orderOf(1, 'Pending', [{ name: 'Coffee', quantity: 15 }])]);
    expect(plates).toHaveLength(PLATE_CAP);
    expect(units).toHaveLength(15);
    expect(hiddenCount).toBe(3);
  });

  it('counts nothing hidden at exactly the cap', () => {
    expect(platesFromOrders([orderOf(1, 'Pending', [{ name: 'Coffee', quantity: PLATE_CAP }])]).hiddenCount).toBe(0);
  });

  it('gives every plate its own key', () => {
    const { plates } = platesFromOrders([orderOf(1, 'Pending', [{ name: 'A', quantity: 2 }, { name: 'B', quantity: 2 }])]);
    expect(new Set(plates.map((plate) => plate.key)).size).toBe(4);
  });

  it('reports the turn in degrees from 0 to 359', () => {
    expect(turnedDegrees(0)).toBe(0);
    expect(turnedDegrees(Math.PI)).toBe(180);
    expect(turnedDegrees(-Math.PI / 2)).toBe(270);
    expect(turnedDegrees(Math.PI * 2)).toBe(0);
  });

  it('turns the table with the arrows and drags only', () => {
    expect(rotationAfterKey(0, 'ArrowRight')).toBeGreaterThan(0);
    expect(rotationAfterKey(0, 'ArrowLeft')).toBeLessThan(0);
    expect(rotationAfterKey(1, 'Enter')).toBe(1);
    expect(rotationAfterDrag(0, 100)).toBeCloseTo(1);
  });
});

describe('tickets', () => {
  it('places each status at its station, oldest first', () => {
    const tickets = ticketsFromOrders([orderOf(3, 'Completed'), orderOf(1, 'Pending'), orderOf(2, 'Preparing')]);
    expect(tickets).toEqual([
      { orderNumber: 1, status: 'Pending', station: 'rail-start' },
      { orderNumber: 2, status: 'Preparing', station: 'stove' },
      { orderNumber: 3, status: 'Completed', station: 'pass' },
    ]);
  });

  it('gives a Cancelled order no ticket', () => {
    expect(ticketsFromOrders([orderOf(1, 'Cancelled')])).toEqual([]);
  });

  it('groups tickets by station, and names three stations', () => {
    const tickets = ticketsFromOrders([orderOf(1, 'Pending'), orderOf(2, 'Pending')]);
    expect(ticketsAtStation(tickets, 'rail-start')).toHaveLength(2);
    expect(ticketsAtStation(tickets, 'pass')).toEqual([]);
    expect(STATIONS.map((station) => station.id)).toEqual(['rail-start', 'stove', 'pass']);
  });
});

describe('spin time', () => {
  it.each([
    ['a fresh event', 0, 0, 5000],
    ['part-way through by the server', 1800, 0, 3200],
    ['counted from receipt', 1000, 500, 3500],
    ['already over', 6000, 0, 0],
    ['held at zero well past the end', 1000, 9000, 0],
    ['held at five seconds if elapsed is negative', -3000, 0, SPIN_DURATION_MS],
  ])('%s', (_name, elapsed, since, expected) => {
    expect(remainingMs(elapsed, since)).toBe(expected);
  });

  it('gives a new spin no phase from the spin before it', () => {
    const earlier = { spinId: 'a', phase: 'result' };
    expect(phaseForSpin(earlier, 'b')).toBe('pending');
    expect(phaseForSpin(earlier, 'a')).toBe('result');
    expect(phaseForSpin(earlier, null)).toBe('idle');
  });

  it('holds seats between 2 and 8', () => {
    expect(clampSeats(1)).toBe(2);
    expect(clampSeats(9)).toBe(8);
    expect(clampSeats(5)).toBe(5);
  });

  it('words the result by question', () => {
    expect(resultSentence({ question: 'tab', resultSeat: 3 })).toBe('Seat 3 picks up the tab!');
    expect(resultSentence({ question: 'dessert', resultSeat: 1 })).toBe('Seat 1 orders dessert!');
  });
});

describe('dice', () => {
  const item = (id, mood, extra = {}) => ({ id, mood, soldOut: false, allergens: [], ...extra });
  const menu = {
    categories: [
      { items: [item('salad', 'light'), item('soup', 'light', { soldOut: true })] },
      { items: [item('burger', 'hearty'), item('cake', 'sweet', { allergens: ['dairy'] })] },
    ],
  };
  const noneUnsafe = () => false;

  it('matches the mood and skips sold-out dishes', () => {
    expect(qualifyingDishes(menu, 'light', noneUnsafe).map((dish) => dish.id)).toEqual(['salad']);
  });

  it('skips a dish with a chosen allergen', () => {
    const unsafe = (dish) => dish.allergens.includes('dairy');
    expect(qualifyingDishes(menu, 'sweet', unsafe)).toEqual([]);
  });

  it('"Surprise me" draws from every qualifying dish', () => {
    expect(qualifyingDishes(menu, 'surprise', noneUnsafe).map((dish) => dish.id)).toEqual(['salad', 'burger', 'cake']);
  });

  it('picks by the random number, and null when nothing qualifies', () => {
    const dishes = [item('a', 'light'), item('b', 'light')];
    expect(pickDish(dishes, () => 0).id).toBe('a');
    expect(pickDish(dishes, () => 0.99).id).toBe('b');
    expect(pickDish([])).toBeNull();
  });

  it('says why, and offers the four moods', () => {
    expect(suggestionReason('light')).toBe('The chef suggests this for a light mood.');
    expect(suggestionReason('surprise')).toContain('surprise');
    expect(MOODS.map((mood) => mood.label)).toEqual(['Light', 'Hearty', 'Sweet', 'Surprise me']);
    expect(NO_MATCH_MESSAGE).toContain('No dish');
  });

  it('counts only a hard movement as a shake', () => {
    expect(isShake({ x: 20, y: 5, z: 5 })).toBe(true);
    expect(isShake({ x: 1, y: 1, z: 9 })).toBe(false);
    expect(isShake({ x: null, y: null, z: null })).toBe(false);
    expect(isShake(null)).toBe(false);
  });
});

describe('support checks', () => {
  const docWith = (getContext) => ({ createElement: () => ({ getContext }) });

  it('sees WebGL and lets go of the test context', () => {
    const loseContext = vi.fn();
    const doc = docWith(() => ({ getExtension: () => ({ loseContext }) }));
    expect(isWebGLAvailable(doc)).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('reports no WebGL when no context comes back', () => {
    expect(isWebGLAvailable(docWith(() => null))).toBe(false);
  });

  it('reports no WebGL when asking throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isWebGLAvailable(docWith(() => { throw new Error('blocked'); }))).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reads the reduced-motion setting', () => {
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(prefersReducedMotion({})).toBe(false);
  });
});
