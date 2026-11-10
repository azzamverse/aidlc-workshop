import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveEvents } from '../shared/live.js';
import { MAX_SEATS, MIN_SEATS, QUESTIONS, clampSeats, phaseForSpin, remainingMs, resultSentence } from './logic/spinTime.js';
import { prefersReducedMotion } from './logic/support.js';
import { SceneHost } from './SceneHost.jsx';
import { buildBottleScene } from './scenes/bottleScene.js';
import { getSpin, startSpin } from './spinApi.js';

function SpinForm({ question, seats, onQuestion, onSeats }) {
  return (
    <>
      <div className="xf-row" role="group" aria-label="Question">
        {QUESTIONS.map((option) => (
          <button
            key={option.id}
            className={option.id === question ? 'pill active' : 'pill'}
            aria-pressed={option.id === question}
            onClick={() => onQuestion(option.id)}
            data-testid={`spin-question-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="xf-row xf-between">
        <span>Seats</span>
        <span className="xf-seats">
          <button aria-label="Fewer seats" disabled={seats <= MIN_SEATS} onClick={() => onSeats(clampSeats(seats - 1))} data-testid="spin-seats-less">−</button>
          <output data-testid="spin-seats-value">{seats}</output>
          <button aria-label="More seats" disabled={seats >= MAX_SEATS} onClick={() => onSeats(clampSeats(seats + 1))} data-testid="spin-seats-more">+</button>
        </span>
      </div>
    </>
  );
}

/** Sets the phase: spinning for the time left on this screen, then the result. */
function useSpinPhase(current, showResultAtOnce) {
  const [phaseState, setPhaseState] = useState({ spinId: null, phase: 'idle' });
  useEffect(() => {
    if (!current) return undefined;
    const spinId = current.spin.id;
    const left = remainingMs(current.elapsedMs, performance.now() - current.receivedAt);
    if (showResultAtOnce || left === 0) {
      setPhaseState({ spinId, phase: 'result' });
      return undefined;
    }
    setPhaseState({ spinId, phase: 'spinning' });
    const timer = setTimeout(() => setPhaseState({ spinId, phase: 'result' }), left);
    return () => clearTimeout(timer);
  }, [current, showResultAtOnce]);
  return phaseForSpin(phaseState, current?.spin.id ?? null);
}

/** C14: Spin the Bottle (US11.1). The server picks; every screen of the table shows it. */
export default function SpinTheBottle({ table }) {
  const [question, setQuestion] = useState('tab');
  const [seats, setSeats] = useState(4);
  const [current, setCurrent] = useState(null);
  const [refusal, setRefusal] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [noThreeD, setNoThreeD] = useState(false);
  const shownId = useRef(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const phase = useSpinPhase(current, reducedMotion || noThreeD);

  const lastRead = useRef(0);
  const visitId = useRef(table.visitId);
  visitId.current = table.visitId;

  const show = useCallback((spin) => {
    if (spin.id === shownId.current || spin.visitId !== visitId.current) return;
    shownId.current = spin.id;
    setRefusal(null);
    setCurrent({ spin, elapsedMs: spin.elapsedMs, receivedAt: performance.now() });
  }, []);

  /** Only the server's read makes a spin live, with the server's own elapsed time. */
  const load = useCallback(async () => {
    const read = ++lastRead.current;
    try {
      const spin = await getSpin(table.id);
      if (spin && read === lastRead.current) show(spin);
    } catch (error) {
      console.warn('The current spin could not be read.', error);
    }
  }, [table.id, show]);

  // A finished spin belongs to its visit, so a new visit starts with none showing.
  useEffect(() => {
    lastRead.current += 1;
    shownId.current = null;
    setCurrent(null);
    setRefusal(null);
  }, [table.visitId]);

  // A reconnecting stream replays old events, so an event only prompts a read.
  useLiveEvents({
    tableId: table.id,
    onOpen: load,
    onEvent(type, data) {
      if (type === 'spin.started' && data.visitId === table.visitId && data.id !== shownId.current) load();
    },
  });

  async function spinBottle() {
    setIsBusy(true);
    setRefusal(null);
    try {
      show(await startSpin(table.id, { question, seats }));
    } catch (error) {
      console.warn('The spin was refused or failed.', error);
      setRefusal(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const spin = current?.spin ?? null;
  const sceneData = useMemo(
    () => ({
      seats: spin ? spin.seats : seats,
      phase,
      spinKey: spin?.id ?? null,
      resultSeat: spin?.resultSeat ?? 1,
      durationMs: current ? remainingMs(current.elapsedMs, performance.now() - current.receivedAt) : 0,
    }),
    [spin, seats, phase, current],
  );

  return (
    <section className="xf" data-testid="slot-spin-the-bottle" data-phase={phase} data-spin-id={spin?.id ?? ''}>
      <h2>Spin the Bottle</h2>
      <SpinForm question={question} seats={seats} onQuestion={setQuestion} onSeats={setSeats} />
      <SceneHost build={buildBottleScene} data={sceneData} label="The bottle and the seats around it" testId="bottle-stage" onUnavailable={() => setNoThreeD(true)} />
      {phase === 'spinning' && <div className="card" role="status" data-testid="spin-status"><strong>The bottle is spinning…</strong></div>}
      {phase === 'result' && spin && <div className="card" role="status" data-testid="spin-result"><strong>{resultSentence(spin)}</strong></div>}
      {refusal && (
        <div className="notice error" role="alert" data-testid="spin-refusal"><span aria-hidden="true">⚠</span><span>{refusal}</span></div>
      )}
      <button className="btn block" disabled={isBusy || phase === 'spinning' || phase === 'pending'} onClick={spinBottle} data-testid="spin-start">Spin the bottle</button>
    </section>
  );
}
