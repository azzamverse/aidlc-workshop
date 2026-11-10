import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placeOrder } from '../../shared/api.js';
import { formatMoney } from '../../shared/money.js';
import CartExtras from '../../features/CartExtras.jsx';
import { ConfirmUnsafe } from '../../features/ConfirmUnsafe.jsx';
import { OptionWords } from '../../features/OptionWords.jsx';
import { useUnsafeDishes } from '../../features/useAllergies.js';
import { cartTotalCents, keyOfLine, MAX_QUANTITY, MIN_QUANTITY, placementLine, soldOutMessage, testKeyOfLine } from './cartStore.js';
import { ClosedScreen, EmptyView, Notice, ReconnectingNotice, TopBar } from './parts.jsx';
import { useCart, useDinerSession } from './useDinerSession.js';

const PLACING_FAILED = "We couldn't place your order. Your cart is safe. Please try again.";

function CartLine({ line, cart, disabled }) {
  const { name, image, quantity, unitPriceCents, optionWords } = line;
  const lineKey = keyOfLine(line);
  const testKey = testKeyOfLine(line);
  const atLimit = quantity >= MAX_QUANTITY;
  // Two lines of one dish must say which is which to a screen reader.
  const spoken = optionWords?.length > 0 ? `${name} (${optionWords.join(', ')})` : name;
  return (
    <article className="card item" data-testid={`cart-line-${testKey}`}>
      <div className="tile" aria-hidden="true">{image}</div>
      <div>
        <div className="line"><h3>{name}</h3><span className="price">{formatMoney(unitPriceCents * quantity)}</span></div>
        <OptionWords words={optionWords} />
        <p className="muted">{formatMoney(unitPriceCents)} each</p>
        <div className="line">
          <div className="stepper">
            <button aria-label={`One fewer ${spoken}`} disabled={disabled || quantity <= MIN_QUANTITY} onClick={() => cart.decrease(lineKey)} data-testid={`cart-fewer-${testKey}`}>−</button>
            <output data-testid={`cart-quantity-${testKey}`}>{quantity}</output>
            <button aria-label={`One more ${spoken}`} disabled={disabled || atLimit} onClick={() => cart.increase(lineKey)} data-testid={`cart-more-${testKey}`}>+</button>
          </div>
          <button className="link-btn" aria-label={`Remove ${spoken}`} disabled={disabled} onClick={() => cart.remove(lineKey)} data-testid={`cart-remove-${testKey}`}>Remove</button>
        </div>
        {atLimit && <p className="muted" data-testid={`cart-limit-${testKey}`}>20 is the most for one item.</p>}
      </div>
    </article>
  );
}

/** Contract C5's /table/:id/cart: the Cart, BR2 and BR3. */
export function CartScreen() {
  const navigate = useNavigate();
  const { table, cart, closed, markClosed, isClosed, reconnecting } = useDinerSession({});
  const { lines } = useCart(cart);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const { unsafe, checkFailed } = useUnsafeDishes(lines);

  /** BR3.4: an unsafe cart asks first. */
  function pressPlaceOrder() {
    if (unsafe.length > 0) setConfirming(true);
    else submit();
  }

  async function submit() {
    const { visitId, placementKey } = cart.getState();
    setSending(true);
    setMessage(null);
    try {
      const order = await placeOrder(table.id, {
        visitId,
        placementKey,
        lines: lines.map(placementLine),
      });
      // The table closed while this was on its way: the closed card stays.
      if (isClosed()) return;
      cart.clear();
      navigate(`/table/${table.id}/orders`, { state: { placedNumber: order.number } });
    } catch (error) {
      if (error.code === 'TABLE_CLOSED') {
        markClosed();
      } else if (error.code === 'ITEM_SOLD_OUT') {
        setMessage(soldOutMessage(cart.removeItems(error.details.soldOutItemIds ?? [])));
      } else {
        console.warn('The order could not be placed.', error);
        setMessage(PLACING_FAILED);
      }
      setSending(false);
    }
  }

  if (closed) return <ClosedScreen title="Your cart" label={table.label} />;

  const total = formatMoney(cartTotalCents(lines));
  return (
    <>
      <TopBar title="Your cart" label={table.label} />
      <main className="content">
        {reconnecting && <ReconnectingNotice />}
        {message && (
          <Notice kind={message === PLACING_FAILED ? 'error' : ''} icon="⚠" testId="cart-message">{message}</Notice>
        )}
        <CartExtras table={table} lines={lines} unsafe={unsafe} checkFailed={checkFailed} />
        {lines.length === 0 ? (
          <EmptyView icon="🛒" title="Your cart is empty" text="Add something from the menu to get started." tableId={table.id} testId="cart-empty" />
        ) : (
          <>
            {lines.map((line) => <CartLine key={keyOfLine(line)} line={line} cart={cart} disabled={sending} />)}
            <div className="total card"><span>Total</span><span className="price" data-testid="cart-total">{total}</span></div>
          </>
        )}
      </main>
      {lines.length > 0 && (
        <div className="summary">
          <button className="btn" disabled={sending} onClick={pressPlaceOrder} data-testid="cart-place-order">
            <span>{sending ? 'Placing…' : 'Place order'}</span>
            <span className="price">{total}</span>
          </button>
        </div>
      )}
      {confirming && (
        <ConfirmUnsafe
          unsafe={unsafe}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            submit();
          }}
        />
      )}
    </>
  );
}
