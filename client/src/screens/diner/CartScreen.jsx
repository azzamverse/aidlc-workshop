import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placeOrder } from '../../shared/api.js';
import { formatMoney } from '../../shared/money.js';
import { cartTotalCents, MAX_QUANTITY, MIN_QUANTITY, soldOutMessage } from './cartStore.js';
import { ClosedScreen, EmptyView, Notice, ReconnectingNotice, TopBar } from './parts.jsx';
import { useCart, useDinerSession } from './useDinerSession.js';

const PLACING_FAILED = "We couldn't place your order. Your cart is safe. Please try again.";

function CartLine({ line, cart, disabled }) {
  const { itemId, name, quantity, unitPriceCents } = line;
  const atLimit = quantity >= MAX_QUANTITY;
  return (
    <article className="card" data-testid={`cart-line-${itemId}`}>
      <div className="line"><h3>{name}</h3><span className="price">{formatMoney(unitPriceCents * quantity)}</span></div>
      <p className="muted">{formatMoney(unitPriceCents)} each</p>
      <div className="line">
        <div className="stepper">
          <button aria-label={`One fewer ${name}`} disabled={disabled || quantity <= MIN_QUANTITY} onClick={() => cart.decrease(itemId)} data-testid={`cart-fewer-${itemId}`}>−</button>
          <output data-testid={`cart-quantity-${itemId}`}>{quantity}</output>
          <button aria-label={`One more ${name}`} disabled={disabled || atLimit} onClick={() => cart.increase(itemId)} data-testid={`cart-more-${itemId}`}>+</button>
        </div>
        <button className="link-btn" aria-label={`Remove ${name}`} disabled={disabled} onClick={() => cart.remove(itemId)} data-testid={`cart-remove-${itemId}`}>Remove</button>
      </div>
      {atLimit && <p className="muted" data-testid={`cart-limit-${itemId}`}>20 is the most for one item.</p>}
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

  async function submit() {
    const { visitId, placementKey } = cart.getState();
    setSending(true);
    setMessage(null);
    try {
      const order = await placeOrder(table.id, {
        visitId,
        placementKey,
        lines: lines.map(({ itemId, quantity }) => ({ itemId, quantity })),
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
        {lines.length === 0 ? (
          <EmptyView icon="🛒" title="Your cart is empty" text="Add something from the menu to get started." tableId={table.id} testId="cart-empty" />
        ) : (
          <>
            {lines.map((line) => <CartLine key={line.itemId} line={line} cart={cart} disabled={sending} />)}
            <div className="total card"><span>Total</span><span className="price" data-testid="cart-total">{total}</span></div>
          </>
        )}
      </main>
      {lines.length > 0 && (
        <div className="summary">
          <button className="btn" disabled={sending} onClick={submit} data-testid="cart-place-order">
            <span>{sending ? 'Placing…' : 'Place order'}</span>
            <span className="price">{total}</span>
          </button>
        </div>
      )}
    </>
  );
}
