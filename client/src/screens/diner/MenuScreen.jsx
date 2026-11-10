import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuExtras from '../../features/MenuExtras.jsx';
import { getMenu } from '../../shared/api.js';
import { formatMoney } from '../../shared/money.js';
import { cartItemCount, cartTotalCents } from './cartStore.js';
import { ClosedScreen, Notice, ReconnectingNotice, Skeletons, SlotView, TopBar } from './parts.jsx';
import { useCart, useDinerSession } from './useDinerSession.js';

const ChefsDice = lazy(() => import('../../xfactors/ChefsDice.jsx'));

// The band below the sticky bar where a heading makes its category the current one.
const CURRENT_LINE_PX = 130;

function useCurrentCategory(categories) {
  const [currentId, setCurrentId] = useState(null);

  useEffect(() => {
    if (categories.length === 0) return undefined;
    function update() {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = categories.filter((category) => {
        const heading = document.getElementById(category.id);
        return heading && heading.getBoundingClientRect().top <= CURRENT_LINE_PX;
      });
      const current = atBottom ? categories.at(-1) : (passed.at(-1) ?? categories[0]);
      setCurrentId(current.id);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [categories]);

  return currentId;
}

function CategoryPills({ categories, currentId }) {
  const bar = useRef(null);

  // Keeps the filled pill in view on a narrow phone, without moving the page.
  useEffect(() => {
    const pill = bar.current?.querySelector('[aria-current="true"]');
    if (pill) bar.current.scrollLeft = pill.offsetLeft - (bar.current.clientWidth - pill.offsetWidth) / 2;
  }, [currentId]);

  function goTo(event, categoryId) {
    event.preventDefault();
    const heading = document.getElementById(categoryId);
    // The stylesheet makes this smooth, and turns that off under reduced motion.
    heading?.scrollIntoView();
    heading?.focus({ preventScroll: true });
  }

  return (
    <nav className="pills" aria-label="Menu categories" ref={bar} data-testid="menu-pills">
      {categories.map((category) => (
        <a
          key={category.id}
          className={category.id === currentId ? 'pill active' : 'pill'}
          href={`#${category.id}`}
          aria-current={category.id === currentId ? 'true' : undefined}
          onClick={(event) => goTo(event, category.id)}
          data-testid={`menu-pill-${category.id}`}
        >
          {category.name}
        </a>
      ))}
    </nav>
  );
}

function MenuItemCard({ item, onAdd }) {
  return (
    <article className={item.soldOut ? 'card item soldout' : 'card item'} data-testid={`menu-item-${item.id}`}>
      <div className="tile" aria-hidden="true">{item.image}</div>
      <div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="price-row">
          <span className="price">{formatMoney(item.priceCents)}</span>
          {item.soldOut ? (
            <span className="soldout-tag" data-testid={`menu-sold-out-${item.id}`}>Sold out</span>
          ) : (
            <button className="add" aria-label={`Add ${item.name}`} onClick={() => onAdd(item)} data-testid={`menu-add-${item.id}`}>+ Add</button>
          )}
        </div>
      </div>
    </article>
  );
}

function ViewCartBar({ tableId, lines }) {
  const count = cartItemCount(lines);
  if (count === 0) return null;
  return (
    <div className="summary">
      <Link className="btn" to={`/table/${tableId}/cart`} data-testid="menu-view-cart">
        <span>View cart · {count} {count === 1 ? 'item' : 'items'}</span>
        <span className="price">{formatMoney(cartTotalCents(lines))}</span>
      </Link>
    </div>
  );
}

const NO_CATEGORIES = [];

/** Contract C5's /table/:id: the Menu, BR1.1 to BR1.4. */
export function MenuScreen() {
  const [menu, setMenu] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  const lastRead = useRef(0);

  const loadMenu = useCallback(async () => {
    const read = ++lastRead.current;
    setLoadFailed(false);
    try {
      const loaded = await getMenu();
      if (read === lastRead.current) setMenu(loaded);
    } catch (error) {
      console.warn('The menu could not be loaded.', error);
      if (read === lastRead.current) setLoadFailed(true);
    }
  }, []);

  const { table, cart, closed, reconnecting } = useDinerSession({
    onReload: loadMenu,
    onEvent(type, data) {
      if (type !== 'menu.item-updated') return;
      setMenu((current) => current && {
        categories: current.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === data.item.id ? { ...item, soldOut: data.item.soldOut } : item)),
        })),
      });
    },
  });
  const { lines } = useCart(cart);
  const categories = menu?.categories ?? NO_CATEGORIES;
  const currentId = useCurrentCategory(categories);

  // BR5.1: saved v1 lines take their default choices once the menu is known.
  useEffect(() => {
    if (menu) cart.applyMenu(menu);
  }, [menu, cart]);

  if (closed) return <ClosedScreen title={table.label} />;

  // A failed reload keeps the menu on screen; the error replaces only an empty one.
  const showError = loadFailed && !menu;
  return (
    <>
      <TopBar title={table.label}>
        {menu && <CategoryPills categories={categories} currentId={currentId} />}
      </TopBar>
      <main className="content">
        {reconnecting && <ReconnectingNotice />}
        {!menu && !showError && <Skeletons testId="menu-loading" />}
        {showError && (
          <>
            <Notice kind="error" icon="⚠" testId="menu-error">We couldn't load the menu. Check your connection and try again.</Notice>
            <button className="btn secondary" onClick={loadMenu} data-testid="menu-error-retry">Try again</button>
          </>
        )}
        {menu && (
          <>
            <MenuExtras table={table} menu={menu} cart={cart} />
            <button className="btn block" aria-expanded={diceOpen} onClick={() => setDiceOpen((open) => !open)} data-testid="menu-chefs-dice">🎲 Chef's Dice</button>
            {diceOpen && (
              <SlotView><ChefsDice table={table} orders={[]} menu={menu} onAddToCart={cart.add} /></SlotView>
            )}
          </>
        )}
        {categories.map((category) => (
          <section className="menu-category" key={category.id} data-testid={`menu-category-${category.id}`}>
            <h2 id={category.id} tabIndex={-1}>{category.name}</h2>
            {category.items.map((item) => <MenuItemCard key={item.id} item={item} onAdd={cart.add} />)}
          </section>
        ))}
      </main>
      <ViewCartBar tableId={table.id} lines={lines} />
    </>
  );
}
