import { useCallback, useEffect, useRef, useState } from 'react';
import { sendStaffPin } from '../shared/api.js';
import { addDigit, isPinComplete, PIN_LENGTH, pinRefusalText } from './staffGate.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** W2: every staff page shows only this until the session is confirmed. */
export function PinScreen({ onSignedIn }) {
  const [entry, setEntry] = useState('');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const current = useRef('');
  const isChecking = useRef(false);

  const show = (value) => {
    current.current = value;
    setEntry(value);
  };

  const submit = useCallback(
    async (pin) => {
      isChecking.current = true;
      setChecking(true);
      try {
        await sendStaffPin(pin);
        onSignedIn();
      } catch (error) {
        if (!error.code) console.warn('The staff PIN could not be checked.', error);
        setMessage(pinRefusalText(error));
        current.current = '';
        setEntry('');
      } finally {
        isChecking.current = false;
        setChecking(false);
      }
    },
    [onSignedIn],
  );

  const press = useCallback(
    (digit) => {
      if (isChecking.current) return;
      const next = addDigit(current.current, digit);
      show(next);
      if (isPinComplete(next)) submit(next);
    },
    [submit],
  );

  useEffect(() => {
    function handleKey(event) {
      if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) press(event.key);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [press]);

  const key = (digit) => (
    <button className="key" key={digit} disabled={checking} onClick={() => press(digit)} data-testid={`pin-key-${digit}`}>{digit}</button>
  );

  return (
    <main className="pin-screen" data-testid="pin-screen">
      <h1>Staff only</h1>
      <p className="muted">Enter the PIN to continue.</p>
      <div className="dots" role="img" aria-label={`${entry.length} of ${PIN_LENGTH} digits entered`} data-testid="pin-dots">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <div className={index < entry.length ? 'dot on' : 'dot'} key={index} />
        ))}
      </div>
      <p className="pin-message" role="alert" data-testid="pin-message">{message}</p>
      <div className="pin">
        {KEYS.map(key)}
        <span />
        {key('0')}
        <span />
      </div>
    </main>
  );
}
