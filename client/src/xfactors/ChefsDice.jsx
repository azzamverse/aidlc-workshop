import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isUnsafe } from '../shared/allergyStore.js';
import { formatMoney } from '../shared/money.js';
import { isShake, MOODS, NO_MATCH_MESSAGE, pickDish, qualifyingDishes, suggestionReason } from './logic/dice.js';
import { prefersReducedMotion } from './logic/support.js';
import { SceneHost } from './SceneHost.jsx';
import { buildDiceScene } from './scenes/diceScene.js';

const ROLL_MS = 900;
const SHAKE_COOLDOWN_MS = 1500;

/** BR12.2: iOS asks first, from a tap. A denial or a missing API is simply no shaking. */
async function askForMotion() {
  try {
    await globalThis.DeviceMotionEvent?.requestPermission?.();
  } catch (error) {
    console.warn('Motion is not available, so shaking is off.', error);
  }
}

function useShake(onShake) {
  const handler = useRef(onShake);
  handler.current = onShake;
  useEffect(() => {
    let lastShake = 0;
    function onMotion(event) {
      const nowMs = performance.now();
      if (!isShake(event.accelerationIncludingGravity) || nowMs - lastShake < SHAKE_COOLDOWN_MS) return;
      lastShake = nowMs;
      handler.current();
    }
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, []);
}

function Suggestion({ item, mood, onAdd, onRoll }) {
  return (
    <>
      <article className="card item" data-testid="dice-suggestion">
        <div className="tile" aria-hidden="true">{item.image}</div>
        <div>
          <h3>{item.name}</h3>
          <p>{suggestionReason(mood)}</p>
          <div className="price-row"><span className="price">{formatMoney(item.priceCents)}</span></div>
        </div>
      </article>
      <div className="xf-row">
        <button className="btn" onClick={onAdd} data-testid="dice-add">Add to cart</button>
        <button className="btn secondary" onClick={onRoll} data-testid="dice-again">Roll again</button>
      </div>
    </>
  );
}

/** C14: Chef's Dice (US12.1), one dish for the mood the diner picks. */
export default function ChefsDice({ menu, onAddToCart }) {
  const [mood, setMood] = useState('light');
  const [result, setResult] = useState(null); // { itemId, mood } or { none: true }
  const [isRolling, setIsRolling] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);
  const [noThreeD, setNoThreeD] = useState(false);
  const timer = useRef(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const showAtOnce = reducedMotion || noThreeD;

  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = useCallback(() => {
    const dish = pickDish(qualifyingDishes(menu, mood, isUnsafe));
    setResult(dish ? { itemId: dish.id, mood } : { none: true });
    setIsRolling(false);
  }, [menu, mood]);

  const roll = useCallback(() => {
    if (isRolling) return;
    setWasAdded(false);
    if (showAtOnce) {
      settle();
      return;
    }
    setIsRolling(true);
    timer.current = setTimeout(settle, ROLL_MS);
  }, [isRolling, showAtOnce, settle]);

  useShake(roll);

  function rollByPress() {
    askForMotion();
    roll();
  }

  function rollOnEnter(event) {
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') roll();
  }

  // The menu is live: a suggested dish that has since sold out is no longer offered.
  const suggested = result?.itemId
    ? menu.categories.flatMap((category) => category.items).find((item) => item.id === result.itemId && !item.soldOut)
    : null;
  const sceneData = useMemo(() => ({ rolling: isRolling }), [isRolling]);

  function addToCart() {
    onAddToCart(suggested);
    setWasAdded(true);
  }

  return (
    <section className="xf" tabIndex={-1} onKeyDown={rollOnEnter} data-testid="slot-chefs-dice">
      <h2>Chef's Dice</h2>
      <p className="muted">Pick a mood, then roll or shake your phone.</p>
      <div className="xf-row" role="group" aria-label="Mood">
        {MOODS.map((option) => (
          <button
            key={option.id}
            className={option.id === mood ? 'pill active' : 'pill'}
            aria-pressed={option.id === mood}
            onClick={() => setMood(option.id)}
            data-testid={`dice-mood-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <SceneHost
        build={buildDiceScene}
        data={sceneData}
        label="Two dice"
        testId="dice-stage"
        short
        stageProps={{ onClick: rollByPress }}
        onUnavailable={() => setNoThreeD(true)}
      />
      <button className="btn block" disabled={isRolling} onClick={rollByPress} data-testid="dice-roll">Roll the dice</button>
      {isRolling && <p className="muted" role="status" data-testid="dice-rolling">Rolling…</p>}
      {!isRolling && suggested && <Suggestion item={suggested} mood={result.mood} onAdd={addToCart} onRoll={rollByPress} />}
      {!isRolling && result && !suggested && (
        <div className="notice" role="status" data-testid="dice-none"><span aria-hidden="true">🎲</span><span>{NO_MATCH_MESSAGE}</span></div>
      )}
      {wasAdded && <p className="muted" role="status" data-testid="dice-added">Added to your cart.</p>}
    </section>
  );
}
