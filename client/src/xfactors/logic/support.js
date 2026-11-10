/** BR9.4: can this browser start 3D at all? Any failure counts as no. */
export function isWebGLAvailable(doc = globalThis.document) {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch (error) {
    console.warn('3D could not be checked, so the text version is shown.', error);
    return false;
  }
}

/** BR9.5: the device setting that stops motion. */
export function prefersReducedMotion(win = globalThis.window) {
  return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
