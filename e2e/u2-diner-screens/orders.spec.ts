import { expect, signIn, test } from '../staff-login';
import { add, archiveOpenVisit, cancelByApi, createOwnServer, LIVE_LIMIT_MS, liveReady, moveByApi, openMenuReady, placeByApi } from './helpers';

const TABLE = 3;
const coffee = [{ itemId: 'coffee', quantity: 1 }];
const statusOf = (page: import('@playwright/test').Page, number: number) => page.getByTestId(`order-${number}`).locator('.status');

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test('no orders shows the empty view with Browse the menu', async ({ page }) => {
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId('orders-empty')).toContainText('No orders yet');
  await expect(page.getByTestId('orders-empty').getByRole('link', { name: 'Browse the menu' })).toBeVisible();
});

test('skeletons while reading, and an error with Try again on failure', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/tables/*/orders', async (route) => {
    await held;
    await route.abort();
  });
  // The screen also reads its orders once its live stream opens. Wait for that read
  // to fail too, or it could succeed after the route is lifted and clear the error.
  const visitChecked = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/visit'));
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId('orders-loading')).toBeVisible();
  release();
  await visitChecked;
  await page.waitForTimeout(500);
  await expect(page.getByTestId('orders-error')).toBeVisible();
  await page.unroute('**/api/tables/*/orders');
  await page.getByTestId('orders-error-retry').click();
  await expect(page.getByTestId('orders-empty')).toBeVisible();
});

test('lists number, items, status word and icon, newest first', async ({ page, request }) => {
  const first = await placeByApi(request, TABLE, [{ itemId: 'tomato-soup', quantity: 1 }, { itemId: 'coffee', quantity: 2 }]);
  const second = await placeByApi(request, TABLE, coffee);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.locator('article.card h3')).toHaveText([`Order #${second.number}`, `Order #${first.number}`]);
  const card = page.getByTestId(`order-${first.number}`);
  await expect(card.locator('.order-lines li')).toHaveText(['1 × Tomato Soup', '2 × Coffee']);
  await expect(card.locator('.price')).toHaveText('$10.50');
  await expect(statusOf(page, first.number)).toHaveText(/Pending/);
  await expect(statusOf(page, first.number).locator('[aria-hidden="true"]')).toHaveText('⏳');
});

test('a status change and another device\'s order arrive within 2 seconds, with no refresh', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await liveReady(page, () => page.goto(`/table/${TABLE}/orders`));

  let started = Date.now();
  await moveByApi(request, order.id, 'Pending', 'Preparing');
  await expect(statusOf(page, order.number)).toHaveText(/Preparing/, { timeout: LIVE_LIMIT_MS });
  expect(Date.now() - started).toBeLessThanOrEqual(LIVE_LIMIT_MS);
  await expect(page.getByTestId(`order-cancel-${order.number}`)).toHaveCount(0);

  started = Date.now();
  const another = await placeByApi(request, TABLE, coffee);
  await expect(page.getByTestId(`order-${another.number}`)).toBeVisible({ timeout: LIVE_LIMIT_MS });
  expect(Date.now() - started).toBeLessThanOrEqual(LIVE_LIMIT_MS);
  await expect(page.locator('article.card h3').first()).toHaveText(`Order #${another.number}`);
});

test('two devices see one order, and a cancel from either shows on both', async ({ page, browser, baseURL }) => {
  const other = await (await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })).newPage();
  await liveReady(other, () => other.goto(`/table/${TABLE}/orders`));
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();

  const placed = other.locator('article.card');
  await expect(placed).toHaveCount(1, { timeout: LIVE_LIMIT_MS });
  await placed.getByRole('button', { name: 'Cancel order' }).click();
  await expect(placed.locator('.status')).toHaveText(/Cancelled/);
  await expect(page.locator('article.card .status')).toHaveText(/Cancelled/, { timeout: LIVE_LIMIT_MS });
  await expect(page.locator('article.card')).toContainText('Not on the bill');
  await other.context().close();
});

test('only a Pending order offers Cancel order', async ({ page, request }) => {
  const pending = await placeByApi(request, TABLE, coffee);
  const preparing = await placeByApi(request, TABLE, coffee);
  const completed = await placeByApi(request, TABLE, coffee);
  await moveByApi(request, preparing.id, 'Pending', 'Preparing');
  await moveByApi(request, completed.id, 'Pending', 'Preparing');
  await moveByApi(request, completed.id, 'Preparing', 'Completed');
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-cancel-${pending.number}`)).toBeVisible();
  await expect(page.getByTestId(`order-cancel-${preparing.number}`)).toHaveCount(0);
  await expect(page.getByTestId(`order-cancel-${completed.number}`)).toHaveCount(0);
});

test('a cancel refused because the kitchen started shows the current status at once', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await page.route('**/cancel', async (route) => {
    await moveByApi(request, order.id, 'Pending', 'Preparing');
    await route.continue();
  });
  await page.goto(`/table/${TABLE}/orders`);
  await page.getByTestId(`order-cancel-${order.number}`).click();
  await expect(page.getByTestId('order-refused')).toHaveText(`🍳Order #${order.number} is already being prepared, so it can't be cancelled.`);
  await expect(statusOf(page, order.number)).toHaveText(/Preparing/);
  await expect(page.getByTestId(`order-cancel-${order.number}`)).toHaveCount(0);
});

test('a cancel that fails for another reason shows an error and changes nothing', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await page.route('**/cancel', (route) => route.abort());
  await page.goto(`/table/${TABLE}/orders`);
  await page.getByTestId(`order-cancel-${order.number}`).click();
  await expect(page.getByTestId('order-refused')).toContainText(`We couldn't cancel Order #${order.number}.`);
  await expect(statusOf(page, order.number)).toHaveText(/Pending/);
  await expect(page.getByTestId(`order-cancel-${order.number}`)).toBeEnabled();
});

test('text from the server shows as plain text, never as markup', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await page.route('**/api/tables/*/orders', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.orders[0].lines[0].name = '<img src=x onerror="window.injected=true">';
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-${order.number}`)).toContainText('<img src=x');
  await expect(page.locator('.order-lines img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { injected?: boolean }).injected)).toBeUndefined();
});

test('a lost connection shows the notice, then catches up on what it missed', async ({ page, request }) => {
  const server = createOwnServer('orders');
  try {
    await server.start();
    const order = await placeByApi(request, TABLE, coffee, server.url);
    await liveReady(page, () => page.goto(`${server.url}/table/${TABLE}/orders`));
    await expect(page.getByTestId(`order-${order.number}`)).toBeVisible();

    await server.stop();
    await expect(page.getByTestId('reconnecting')).toContainText("Reconnecting… we'll catch up on any changes.");
    await server.start();
    await signIn(page.context(), server.url);
    await moveByApi(request, order.id, 'Pending', 'Preparing', server.url);

    await expect(statusOf(page, order.number)).toHaveText(/Preparing/, { timeout: 15_000 });
    await expect(page.getByTestId('reconnecting')).toHaveCount(0);
  } finally {
    await server.remove();
  }
});

test('a cancel from the API updates a screen, as the kitchen\'s refusal will rely on', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await liveReady(page, () => page.goto(`/table/${TABLE}/orders`));
  await cancelByApi(request, TABLE, order.id);
  await expect(statusOf(page, order.number)).toHaveText(/Cancelled/, { timeout: LIVE_LIMIT_MS });
});
