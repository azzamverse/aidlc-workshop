import { describe, expect, it, vi } from 'vitest';
import { announce, isMuted, playChime, setMuted, vibrateDevice } from '../../client/src/features/alerts.js';
import { bannerFor, dismissOrders, emptyState, observeOrders, readState, saveState } from '../../client/src/features/notifications.js';

const VISIT = 'visit-1';
const order = (id, status, number = 1, visitId = VISIT) => ({ id, status, number, visitId });

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

describe('observeOrders', () => {
  it('announces an order last seen open that is now Completed', () => {
    const seen = observeOrders(emptyState(VISIT), VISIT, [order('a', 'Preparing')]).state;
    expect(observeOrders(seen, VISIT, [order('a', 'Completed')]).ready.map((one) => one.id)).toEqual(['a']);
  });

  it('never announces an order it has not seen', () => {
    expect(observeOrders(emptyState(VISIT), VISIT, [order('a', 'Completed')]).ready).toEqual([]);
  });

  it('announces only once', () => {
    const first = observeOrders(emptyState(VISIT), VISIT, [order('a', 'Pending')]).state;
    const second = observeOrders(first, VISIT, [order('a', 'Completed')]).state;
    expect(observeOrders(second, VISIT, [order('a', 'Completed')]).ready).toEqual([]);
  });

  it('never announces a dismissed order', () => {
    const seen = observeOrders(emptyState(VISIT), VISIT, [order('a', 'Pending')]).state;
    expect(observeOrders(dismissOrders(seen, ['a']), VISIT, [order('a', 'Completed')]).ready).toEqual([]);
  });

  it('ignores another visit\'s orders and a cancelled order', () => {
    const seen = observeOrders(emptyState(VISIT), VISIT, [order('a', 'Pending'), order('b', 'Pending', 2, 'old')]).state;
    expect(seen.lastSeen.b).toBeUndefined();
    expect(observeOrders(seen, VISIT, [order('a', 'Cancelled')]).ready).toEqual([]);
  });

  it('a new visit forgets the old one', () => {
    const seen = observeOrders(emptyState('old'), 'old', [order('a', 'Pending', 1, 'old')]).state;
    expect(observeOrders(seen, VISIT, []).state).toEqual(emptyState(VISIT));
  });

  it('a late, older read does not move an order back or announce it again', () => {
    const preparing = observeOrders(emptyState(VISIT), VISIT, [order('a', 'Preparing')]).state;
    const completed = observeOrders(preparing, VISIT, [order('a', 'Completed')]).state;
    const late = observeOrders(completed, VISIT, [order('a', 'Preparing')]);
    expect(late.state.lastSeen.a).toBe('Completed');
    expect(observeOrders(late.state, VISIT, [order('a', 'Completed')]).ready).toEqual([]);
  });
});

describe('bannerFor', () => {
  it('names one order', () => {
    expect(bannerFor([order('a', 'Completed', 12)]).text).toBe('Order #12 is ready');
  });

  it('counts several', () => {
    expect(bannerFor([order('a', 'Completed', 12), order('b', 'Completed', 13)])).toEqual({ orderIds: ['a', 'b'], text: '2 orders are ready' });
  });
});

describe('the device memory', () => {
  it('saves and reads back, and another visit counts as nothing', () => {
    const storage = memoryStorage();
    const state = dismissOrders(observeOrders(emptyState(VISIT), VISIT, [order('a', 'Pending')]).state, ['z']);
    saveState(storage, 5, state);
    expect(readState(storage, 5, VISIT)).toEqual(state);
    expect(readState(storage, 5, 'other')).toEqual(emptyState('other'));
  });

  it('keeps a dismissal saved by another tab', () => {
    const storage = memoryStorage();
    saveState(storage, 5, dismissOrders(emptyState(VISIT), ['from-other-tab']));
    saveState(storage, 5, dismissOrders(emptyState(VISIT), ['mine']));
    expect(readState(storage, 5, VISIT).dismissed.sort()).toEqual(['from-other-tab', 'mine']);
  });

  it('unreadable or blocked storage counts as empty and throws nothing', () => {
    expect(readState(memoryStorage({ 'table-order.notify.5': '{oops' }), 5, VISIT)).toEqual(emptyState(VISIT));
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readState(blocked, 5, VISIT)).toEqual(emptyState(VISIT));
    expect(() => saveState(blocked, 5, emptyState(VISIT))).not.toThrow();
    warn.mockRestore();
  });
});

describe('sound, vibration and mute', () => {
  function fakeAudio() {
    const oscillator = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const AudioContext = vi.fn(function fake() {
      this.createOscillator = () => oscillator;
      this.currentTime = 0;
      this.destination = {};
      this.resume = async () => {};
    });
    return { AudioContext, oscillator };
  }

  it('remembers mute per scope, and survives a reload', () => {
    const storage = memoryStorage();
    setMuted('kitchen', true, storage);
    expect(isMuted('kitchen', storage)).toBe(true);
    expect(isMuted('diner', storage)).toBe(false);
  });

  it('a device with no sound or vibration throws nothing', () => {
    expect(() => playChime({})).not.toThrow();
    expect(() => vibrateDevice({})).not.toThrow();
  });

  it('a device that refuses sound or vibration throws nothing', () => {
    const refusing = { AudioContext: vi.fn(function fake() { throw new Error('blocked'); }), navigator: { vibrate: () => { throw new Error('blocked'); } } };
    expect(() => playChime(refusing)).not.toThrow();
    expect(() => vibrateDevice(refusing)).not.toThrow();
  });

  it('vibrates only the diner, unless muted', () => {
    const env = { navigator: { vibrate: vi.fn() } };
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    announce('kitchen', env);
    expect(env.navigator.vibrate).not.toHaveBeenCalled();
    announce('diner', env);
    expect(env.navigator.vibrate).toHaveBeenCalledTimes(1);
    setMuted('diner', true, storage);
    announce('diner', env);
    expect(env.navigator.vibrate).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('plays a chime where sound is available', () => {
    const { AudioContext, oscillator } = fakeAudio();
    playChime({ AudioContext });
    expect(oscillator.start).toHaveBeenCalled();
  });
});
