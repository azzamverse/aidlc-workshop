import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href]';

/** An in-page dialog above the tab bar. It takes focus, closes on Escape and returns focus. */
export function Sheet({ title, onClose, testId, children }) {
  const box = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    box.current.focus();
    return () => opener?.focus?.();
  }, []);

  function keepFocusInside(event) {
    const focusable = [...box.current.querySelectorAll(FOCUSABLE)];
    const [first, last] = [focusable[0], focusable.at(-1)];
    const isLeaving = event.shiftKey
      ? document.activeElement === first || document.activeElement === box.current
      : document.activeElement === last;
    if (!isLeaving) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }

  function handleKey(event) {
    if (event.key === 'Escape') onClose();
    if (event.key === 'Tab') keepFocusInside(event);
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={box} onKeyDown={handleKey} data-testid={testId}>
      <h1 id={titleId}>{title}</h1>
      {children}
    </div>
  );
}
