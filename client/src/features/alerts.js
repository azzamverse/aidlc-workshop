/** Mute, sound and vibration. Nothing here may ever stop a banner or alert (BR1.2, BR1.7). */

const muteKey = (scope) => `table-order.mute.${scope}`;
const CHIME_HZ = 880;
const CHIME_SECONDS = 0.18;
const VIBRATE_MS = 200;

// Holds the setting for this page when the device refuses to save it.
const unsaved = new Map();
let audio = null;

export function isMuted(scope, storage = globalThis.localStorage) {
  if (unsaved.has(scope)) return unsaved.get(scope);
  try {
    return storage.getItem(muteKey(scope)) === 'true';
  } catch {
    return false; // Unreadable device storage counts as empty.
  }
}

export function setMuted(scope, muted, storage = globalThis.localStorage) {
  try {
    storage.setItem(muteKey(scope), String(muted));
    unsaved.delete(scope);
  } catch (error) {
    console.warn('The mute setting could not be saved on this device.', error);
    unsaved.set(scope, muted);
  }
}

/** Browsers may refuse sound until the page is touched; a refusal is expected and ignored. */
export function playChime(env = globalThis) {
  try {
    const AudioContextClass = env.AudioContext ?? env.webkitAudioContext;
    if (!AudioContextClass) return;
    audio ??= new AudioContextClass();
    audio.resume?.()?.catch?.(() => {});
    const oscillator = audio.createOscillator();
    oscillator.frequency.value = CHIME_HZ;
    oscillator.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + CHIME_SECONDS);
  } catch {
    audio = null; // No sound on this device; the banner still shows.
  }
}

export function vibrateDevice(env = globalThis) {
  try {
    env.navigator?.vibrate?.(VIBRATE_MS);
  } catch {
    // No vibration on this device; the banner still shows.
  }
}

/** The sound and vibration for a banner or alert, unless this device's scope is muted. */
export function announce(scope, env = globalThis) {
  if (isMuted(scope)) return;
  playChime(env);
  if (scope === 'diner') vibrateDevice(env);
}
