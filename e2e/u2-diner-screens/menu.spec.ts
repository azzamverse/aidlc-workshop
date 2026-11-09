import { expect, test } from '@playwright/test';
import { watchArrival } from '../timing';
import { add, archiveOpenVisit, LIVE_LIMIT_MS, liveReady, openMenuReady, setSoldOut } from './helpers';

const TABLE = 1;

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test('an unknown table address shows "Table not found" and opens no diner screen', async ({ page }) => {
  for (const address of ['/table/99', '/table/99/cart', '/table/99/orders']) {
    await page.goto(address);
    await expect(page.getByTestId('table-not-found')).toContainText('Table not found');
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByTestId('cart-empty')).toHaveCount(0);
    await expect(page.getByTestId('orders-empty')).toHaveCount(0);
  }
});

test('shows every category and item, with the pills in a bar that stays at the top', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.locator('h2')).toHaveText(['Starters', 'Mains', 'Desserts', 'Drinks']);
  await expect(page.locator('article.item')).toHaveCount(12);
  const coffee = page.getByTestId('menu-item-coffee');
  await expect(coffee).toContainText('Freshly brewed house blend.');
  await expect(coffee).toContainText('$2.50');
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  const top = await page.locator('header.topbar').evaluate((bar) => bar.getBoundingClientRect().top);
  expect(top).toBe(0);
});

test('"+ Add" looks about 32 px tall with a 44 px touch area, at the far right of the price row', async ({ page }) => {
  await openMenuReady(page, TABLE);
  const facts = await page.getByTestId('menu-add-coffee').evaluate((button) => {
    const box = button.getBoundingClientRect();
    const after = getComputedStyle(button, '::after');
    const row = (button.parentElement as Element).getBoundingClientRect();
    return {
      height: box.height,
      touchHeight: box.height - parseFloat(after.top) - parseFloat(after.bottom),
      gapToRowEnd: row.right - box.right,
    };
  });
  expect(facts).toEqual({ height: 32, touchHeight: 44, gapToRowEnd: 0 });
});

test('a pill scrolls to its category and is filled in, the last one included', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.getByTestId('menu-pill-starters')).toHaveAttribute('aria-current', 'true');
  for (const category of ['desserts', 'drinks', 'mains']) {
    await page.getByTestId(`menu-pill-${category}`).click();
    await expect(page.getByTestId(`menu-pill-${category}`)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId(`menu-pill-${category}`)).toHaveClass(/active/);
    await expect(page.locator('.pill.active')).toHaveCount(1);
  }
});

test('"+ Add" updates the badge and "View cart", and the bar sits above the tabs', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.getByTestId('menu-view-cart')).toHaveCount(0);
  await add(page, 'coffee');
  await expect(page.getByTestId('menu-view-cart')).toHaveText(/View cart · 1 item\s*\$2\.50/);
  await add(page, 'coffee');
  await add(page, 'garlic-bread');
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('3');
  await expect(page.getByTestId('menu-view-cart')).toHaveText(/View cart · 3 items\s*\$9\.50/);
  const barBottom = await page.getByTestId('menu-view-cart').evaluate((bar) => bar.getBoundingClientRect().bottom);
  const tabsTop = await page.getByTestId('tab-bar').evaluate((bar) => bar.getBoundingClientRect().top);
  expect(barBottom).toBeLessThanOrEqual(tabsTop);
  await page.getByTestId('menu-view-cart').click();
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/cart$`));
});

test('skeletons show while loading, and a failure offers Try again, never an empty menu', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/menu', async (route) => {
    await held;
    await route.abort();
  });
  await page.goto(`/table/${TABLE}`);
  await expect(page.getByTestId('menu-loading').locator('.skeleton')).toHaveCount(3);
  release();
  await expect(page.getByTestId('menu-error')).toContainText("We couldn't load the menu. Check your connection and try again.");
  await expect(page.locator('article.item')).toHaveCount(0);
  await page.unroute('**/api/menu');
  await page.getByTestId('menu-error-retry').click();
  await expect(page.locator('article.item')).toHaveCount(12);
  await expect(page.getByTestId('menu-error')).toHaveCount(0);
});

test.describe('sold out', () => {
  test.afterEach(async ({ request }) => setSoldOut(request, 'ice-cream', false));

  test('a change reaches an open Menu within 2 seconds, with no refresh, and never edits the cart', async ({ page, request }) => {
    await liveReady(page, () => openMenuReady(page, TABLE));
    await add(page, 'ice-cream');

    // Read the arrival time inside the page: WebKit's automation can take seconds to report back.
    const arrivedAt = await watchArrival(page, '[data-testid="menu-sold-out-ice-cream"]');
    const started = Date.now();
    await setSoldOut(request, 'ice-cream', true);
    await expect(page.getByTestId('menu-sold-out-ice-cream')).toHaveText('Sold out', { timeout: LIVE_LIMIT_MS });
    expect((await arrivedAt()) - started).toBeLessThanOrEqual(LIVE_LIMIT_MS);
    await expect(page.getByTestId('menu-add-ice-cream')).toHaveCount(0);
    await expect(page.getByTestId('menu-item-ice-cream')).toHaveClass(/soldout/);
    await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');

    await setSoldOut(request, 'ice-cream', false);
    await expect(page.getByTestId('menu-add-ice-cream')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  });
});

test('the keyboard reaches and uses a pill, "+ Add" and the View cart bar', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-pill-drinks').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-pill-drinks')).toHaveAttribute('aria-current', 'true');
  const add = page.getByRole('button', { name: 'Add Coffee' });
  await add.focus();
  const outline = await add.evaluate((button) => getComputedStyle(button).outlineStyle);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');
  expect(outline).toBe('solid');
  await page.getByTestId('menu-view-cart').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/cart$`));
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('pills jump, and no transition or animation runs', async ({ page }) => {
    await openMenuReady(page, TABLE);
    await page.getByTestId('menu-pill-desserts').click();
    // No smooth scroll: the page has already arrived on the next frame.
    const top = await page.evaluate(() => new Promise<number>((resolve) => {
      requestAnimationFrame(() => resolve((document.getElementById('desserts') as Element).getBoundingClientRect().top));
    }));
    expect(top).toBeLessThan(130);
    const facts = await page.evaluate(() => ({
      behavior: getComputedStyle(document.documentElement).scrollBehavior,
      pill: getComputedStyle(document.querySelector('.pill') as Element).transitionDuration,
      add: getComputedStyle(document.querySelector('.add') as Element).transitionDuration,
    }));
    expect(facts.behavior).toBe('auto');
    expect(facts.pill).toBe('0s');
    expect(facts.add).toBe('0s');
  });
});
