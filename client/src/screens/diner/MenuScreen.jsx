import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getMenu, newPlacementKey, placeOrder } from '../../shared/api.js';
import { setCartCount } from '../../shared/cartCount.js';
import { formatMoney } from '../../shared/money.js';

/**
 * TODO(U2): the walking skeleton's plain page, kept deliberately simple so it
 * proves an order reaches the kitchen. U2 replaces this file with the real Menu.
 */
export function MenuScreen() {
  const { table } = useOutletContext();
  const [menu, setMenu] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [placementKey, setPlacementKey] = useState(newPlacementKey);
  const [result, setResult] = useState(null);

  const loadMenu = useCallback(async () => {
    setLoadFailed(false);
    try {
      setMenu(await getMenu());
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const itemCount = useMemo(() => Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0), [quantities]);

  useEffect(() => {
    setCartCount(itemCount);
  }, [itemCount]);

  function addItem(itemId) {
    setResult(null);
    setQuantities((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }));
  }

  async function submitOrder() {
    const lines = Object.entries(quantities).map(([itemId, quantity]) => ({ itemId, quantity }));
    try {
      const order = await placeOrder(table.id, { visitId: table.visitId, placementKey, lines });
      setResult({ message: `Order #${order.number} placed.` });
      setQuantities({});
      setPlacementKey(newPlacementKey());
    } catch (error) {
      setResult({ message: error.message, isError: true });
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="title"><h1>Menu</h1><span className="muted">{table.label}</span></div>
      </header>
      <main className="content">
        {loadFailed && (
          <>
            <div className="notice error" role="alert" data-testid="menu-error">
              <span aria-hidden="true">⚠</span>
              <span>We couldn't load the menu. Check your connection and try again.</span>
            </div>
            <button className="btn secondary" onClick={loadMenu} data-testid="menu-error-retry">Try again</button>
          </>
        )}
        {menu?.categories.map((category) => (
          <section key={category.id} data-testid={`menu-category-${category.id}`}>
            <h2>{category.name}</h2>
            {category.items.map((item) => (
              <p key={item.id} className="line">
                <span>{item.image} {item.name} · {formatMoney(item.priceCents)}</span>
                <button className="add" onClick={() => addItem(item.id)} aria-label={`Add ${item.name}`} data-testid={`menu-add-${item.id}`}>+ Add</button>
              </p>
            ))}
          </section>
        ))}
        {result && (
          <div className={result.isError ? 'notice error' : 'notice info'} role="status" data-testid="menu-order-result">
            {result.message}
          </div>
        )}
      </main>
      <div className="summary">
        <button className="btn" onClick={submitOrder} disabled={itemCount === 0} data-testid="menu-place-order">Place order</button>
      </div>
    </>
  );
}
