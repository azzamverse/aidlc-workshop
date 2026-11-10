import { useEffect, useRef, useState } from 'react';
import { isWebGLAvailable, prefersReducedMotion } from './logic/support.js';
import './xfactors.css';

/**
 * Runs one 3D scene, and stands aside for the text version where 3D can't run
 * (BR9.4). three.js loads here, so only when a view opens (BR9.6).
 *
 * `build(THREE, { container, reducedMotion, onFail })` returns a scene with
 * update(data), tick(timeMs), render() and dispose(). `build` must be stable.
 * `onUnavailable` runs once the scene is known not to run.
 */
export function SceneHost({ build, data, label, testId, short = false, stageProps = {}, onUnavailable }) {
  const container = useRef(null);
  const scene = useRef(null);
  const latest = useRef({ data, onUnavailable });
  latest.current = { data, onUnavailable };
  const [isFallback, setIsFallback] = useState(() => !isWebGLAvailable());

  useEffect(() => {
    if (isFallback) latest.current.onUnavailable?.();
  }, [isFallback]);

  useEffect(() => {
    if (isFallback) return undefined;
    let isClosed = false;
    let frame = null;
    const reducedMotion = prefersReducedMotion();

    function release() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      const running = scene.current;
      scene.current = null;
      running?.dispose();
    }

    function fail(error) {
      console.warn('The 3D view stopped, so the text version is shown.', error);
      isClosed = true;
      try {
        release();
      } catch (releaseError) {
        console.warn('The 3D view could not be released.', releaseError);
      }
      setIsFallback(true);
    }

    function loop(timeMs) {
      try {
        scene.current.tick(timeMs);
        scene.current.render();
        frame = requestAnimationFrame(loop);
      } catch (error) {
        fail(error);
      }
    }

    import('three')
      .then((THREE) => {
        if (isClosed) return;
        scene.current = build(THREE, { container: container.current, reducedMotion, onFail: fail });
        scene.current.update(latest.current.data);
        scene.current.render();
        if (!reducedMotion) frame = requestAnimationFrame(loop);
      })
      .catch(fail);

    return () => {
      isClosed = true;
      release();
    };
  }, [build, isFallback]);

  useEffect(() => {
    if (!scene.current) return;
    try {
      scene.current.update(data);
      scene.current.render();
    } catch (error) {
      console.warn('The 3D view could not be updated, so the text version is shown.', error);
      scene.current.dispose();
      scene.current = null;
      setIsFallback(true);
    }
  }, [data]);

  if (isFallback) {
    return <p className="xf-fallback" data-testid="scene-fallback">This view is shown as text on this device.</p>;
  }
  return (
    <div
      ref={container}
      className={short ? 'xf-stage short' : 'xf-stage'}
      role="img"
      aria-label={label}
      data-testid={testId}
      {...stageProps}
    />
  );
}
