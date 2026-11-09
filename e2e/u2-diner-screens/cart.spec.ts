import { expect, test } from '@playwright/test';
import { add, archiveOpenVisit, openMenuReady, setSoldOut } from './helpers';

const TABLE = 2;
const place = (page: import('@playwright/test').Page) => page.getByTestId('cart-place-order');

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test('an empty cart shows its view and no Place order', async ({ page }) => {
  await page.goto(`/table/${TABLE}/cart`);
  await expect(page.getByTestId('cart-empty')).toContainText('Your cart is empty');
  await expect(place(page)).toHaveCount(0);
  await page.getByRole('link', { name: 'Browse the menu' }).click();
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}$`));
});

test('the stepper, its limits, Remove and the total', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await add(page, 'cheeseburger');
  await page.getByTestId('tab-cart').click();

  await expect(page.getByTestId('cart-total')).toHaveText('$14.00');
  await expect(page.getByRole('button', { name: 'One fewer Coffee' })).toBeDisabled();
  await page.getByRole('button', { name: 'One more Coffee' }).click();
  await expect(page.getByTestId('cart-line-coffee')).toContainText('$5.00');
  await expect(page.getByTestId('cart-total')).toHaveText('$16.50');
  // In-page presses: 18 driven clicks can outlast WebKit's time in a long run.
  await page.getByRole('button', { name: 'One more Coffee' }).evaluate((button: HTMLElement) => {
    for (let press = 0; press < 18; press += 1) button.click();
  });
  await expect(page.getByTestId('cart-quantity-coffee')).toHaveText('20');
  await expect(page.getByRole('button', { name: 'One more Coffee' })).toBeDisabled();
  await expect(page.getByTestId('cart-limit-coffee')).toHaveText('20 is the most for one item.');
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('21');

  await page.getByRole('button', { name: 'Remove Coffee' }).click();
  await expect(page.getByTestId('cart-line-coffee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('$11.50');
  await page.getByRole('button', { name: 'Remove Cheeseburger' }).click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
});

test('a refresh keeps the cart and the badge, and another device does not share it', async ({ page, browser, baseURL }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await add(page, 'coffee');
  await page.reload();
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('2');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('cart-quantity-coffee')).toHaveText('2');

  const other = await (await browser.newContext({ baseURL })).newPage();
  await other.goto(`/table/${TABLE}/cart`);
  await expect(other.getByTestId('cart-empty')).toBeVisible();
  await other.context().close();
});

test('unreadable saved data counts as an empty cart', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{oops'), `table-order.cart.${TABLE}`);
  await page.goto(`/table/${TABLE}/cart`);
  await expect(page.getByTestId('cart-empty')).toBeVisible();
});

test('placing empties the cart, opens My orders and says so', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await place(page).click();
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/orders$`));
  await expect(page.getByTestId('order-placed')).toContainText(/Order #\d+ placed\. We'll keep its status updated here\./);
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
  await expect(page.locator('article.card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('article.card')).toHaveCount(1);
  await expect(page.getByTestId('order-placed')).toHaveCount(0);
});

test('a failed placement keeps the cart, reads "Placing…" while waiting, and the retry reuses the key', async ({ page }) => {
  const keys: string[] = [];
  // The first try is held until the test has seen "Placing…": a fixed delay can end
  // before WebKit's slow click even returns.
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/tables/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    keys.push(route.request().postDataJSON().placementKey);
    if (keys.length === 1) await held;
    return route.abort();
  });
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();

  await place(page).click();
  await expect(place(page)).toBeDisabled();
  await expect(place(page)).toContainText('Placing…');
  release();
  await expect(page.getByTestId('cart-message')).toContainText("We couldn't place your order. Your cart is safe. Please try again.");
  await expect(place(page)).toBeEnabled();
  await expect(page.getByTestId('cart-quantity-coffee')).toHaveText('1');
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);

  await page.reload();
  await place(page).click();
  await expect(page.getByTestId('cart-message')).toBeVisible();
  expect(keys[2]).toBe(keys[0]);

  await page.getByRole('button', { name: 'One more Coffee' }).click();
  await place(page).click();
  await expect(page.getByTestId('cart-message')).toBeVisible();
  await expect.poll(() => keys.length).toBeGreaterThanOrEqual(6);
  expect(keys[4]).not.toBe(keys[0]);
});

test('a refusal from the server keeps the cart unchanged', async ({ page }) => {
  await page.route('**/api/tables/*/orders', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } } });
  });
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await place(page).click();
  await expect(page.getByTestId('cart-message')).toContainText('Your cart is safe');
  await expect(page.getByTestId('cart-line-coffee')).toBeVisible();
});

test.describe('sold out while ordering', () => {
  test.afterEach(async ({ request }) => {
    await setSoldOut(request, 'ice-cream', false);
    await setSoldOut(request, 'apple-pie', false);
  });

  test('names the item, removes it, keeps the rest, creates no order, and the rest can be placed', async ({ page, request }) => {
    await openMenuReady(page, TABLE);
    await add(page, 'ice-cream');
    await add(page, 'coffee');
    await page.getByTestId('tab-cart').click();
    await setSoldOut(request, 'ice-cream', true);
    await place(page).click();

    await expect(page.getByTestId('cart-message')).toContainText('Ice Cream just sold out, so we took it out of your cart. Nothing has been ordered yet.');
    await expect(page.getByTestId('cart-line-ice-cream')).toHaveCount(0);
    await expect(page.getByTestId('cart-line-coffee')).toBeVisible();
    const { orders } = await (await request.get(`/api/tables/${TABLE}/orders`)).json();
    expect(orders).toEqual([]);

    await place(page).click();
    await expect(page.getByTestId('order-placed')).toBeVisible();
    await expect(page.locator('article.card')).toContainText('1 × Coffee');
  });

  test('when every item sold out, the empty view shows beneath the message', async ({ page, request }) => {
    await openMenuReady(page, TABLE);
    await add(page, 'ice-cream');
    await add(page, 'apple-pie');
    await page.getByTestId('tab-cart').click();
    await setSoldOut(request, 'ice-cream', true);
    await setSoldOut(request, 'apple-pie', true);
    await place(page).click();
    await expect(page.getByTestId('cart-message')).toContainText('Ice Cream and Apple Pie just sold out, so we took them out of your cart. Nothing has been ordered yet.');
    await expect(page.getByTestId('cart-empty')).toBeVisible();
    await expect(place(page)).toHaveCount(0);
  });
});

test('the keyboard can change a quantity, remove a line and place an order', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await add(page, 'lemonade');
  await page.getByTestId('tab-cart').click();
  await page.getByRole('button', { name: 'One more Coffee' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cart-quantity-coffee')).toHaveText('2');
  await page.getByRole('button', { name: 'Remove Lemonade' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('cart-line-lemonade')).toHaveCount(0);
  await place(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('order-placed')).toBeVisible();
});
