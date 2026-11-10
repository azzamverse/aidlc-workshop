/** Removes one object's GPU resources, its texture maps included. */
function disposeObject(object) {
  object.geometry?.dispose();
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    material?.map?.dispose();
    material?.dispose();
  }
}

/** Empties a group and releases what it held. */
export function clearGroup(group) {
  for (const child of [...group.children]) {
    child.traverse(disposeObject);
    group.remove(child);
  }
}

/** A texture of centred lines of words, for tickets, seats and dice faces. */
export function createTextTexture(THREE, lines, { background = '#fbf1df', color = '#17101f', size = 128 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const drawing = canvas.getContext('2d');
  drawing.fillStyle = background;
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  drawing.fillStyle = color;
  drawing.textAlign = 'center';
  drawing.textBaseline = 'middle';
  const lineHeight = canvas.height / (lines.length + 1);
  lines.forEach((line, index) => {
    const fontSize = Math.min(lineHeight * 0.8, (canvas.width * 1.5) / Math.max(line.length, 1));
    drawing.font = `700 ${fontSize}px system-ui, sans-serif`;
    drawing.fillText(line, canvas.width / 2, lineHeight * (index + 1));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The renderer, camera, lights and clean-up every scene shares. */
export function createStage(THREE, { container, onFail, cameraPosition, lookAt = [0, 0, 0] }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(...cameraPosition);
  camera.lookAt(...lookAt);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xffe7c0, 2.2);
  sun.position.set(3, 8, 5);
  scene.add(sun);

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  container.appendChild(renderer.domElement);

  const onContextLost = (event) => {
    event.preventDefault();
    onFail(new Error('The 3D context was lost.'));
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const observer = new ResizeObserver(() => {
    resize();
    renderer.render(scene, camera);
  });
  observer.observe(container);

  return {
    scene,
    camera,
    render: () => renderer.render(scene, camera),
    dispose() {
      observer.disconnect();
      // First, so losing the context on purpose below is not taken as a failure.
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse(disposeObject);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
