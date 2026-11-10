import { useMemo, useRef, useState } from 'react';
import { plateWord, platesFromOrders, rotationAfterDrag, rotationAfterKey, turnedDegrees } from './logic/plates.js';
import { SceneHost } from './SceneHost.jsx';
import { buildTableScene } from './scenes/tableScene.js';

/** C14: The Living Table (US9.1), one plate per dish on a table the diner can turn. */
export default function LivingTable({ orders }) {
  const [rotation, setRotation] = useState(0);
  const dragX = useRef(null);
  const { plates, units, hiddenCount } = useMemo(() => platesFromOrders(orders), [orders]);
  const sceneData = useMemo(() => ({ plates, rotation }), [plates, rotation]);

  const stageProps = {
    className: 'xf-stage grab',
    tabIndex: 0,
    role: 'slider',
    'aria-label': 'Turn the table. Use the left and right arrow keys.',
    'aria-orientation': 'horizontal',
    'aria-valuemin': 0,
    'aria-valuemax': 359,
    'aria-valuenow': turnedDegrees(rotation),
    'aria-valuetext': `Turned ${turnedDegrees(rotation)} degrees`,
    'data-rotation': rotation.toFixed(3),
    onKeyDown(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setRotation((current) => rotationAfterKey(current, event.key));
    },
    onPointerDown(event) {
      dragX.current = event.clientX;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove(event) {
      if (dragX.current === null) return;
      const pixels = event.clientX - dragX.current;
      dragX.current = event.clientX;
      setRotation((current) => rotationAfterDrag(current, pixels));
    },
    onPointerUp() {
      dragX.current = null;
    },
    onPointerCancel() {
      dragX.current = null;
    },
  };

  return (
    <section className="xf" data-testid="slot-living-table">
      <h2>The Living Table</h2>
      <SceneHost build={buildTableScene} data={sceneData} label="Your table with its plates" testId="living-stage" stageProps={stageProps} />
      {hiddenCount > 0 && <p className="muted" data-testid="living-more">+{hiddenCount} more</p>}
      <p className="muted">Drag to spin, or use the left and right arrow keys.</p>
      <div className="card" data-testid="living-summary">
        {units.length === 0 ? (
          <p className="muted">No plates yet. Dishes you order will appear here.</p>
        ) : (
          <ul className="xf-summary">
            {units.map((unit) => (
              <li key={unit.key} data-testid="living-unit"><strong>{unit.dishName}</strong> {plateWord(unit.state)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
