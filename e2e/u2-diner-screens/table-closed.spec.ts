import { expect, signIn, test, type Page } from '../staff-login';
import { add, archiveOpenVisit, closeTable, createOwnServer, LIVE_LIMIT_MS, liveReady, openMenuReady, placeByApi, visitOf } from './helpers';

const TABLE = 4;
const CLOSED_WORDS = 'This table was closed';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

/** Counts the visit-starting read, which only a tab press or a refresh may make. */
function countTableReads(page: Page) {
  const reads = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === `/api/tables/${TABLE}`) reads.count += 1;
  });
  return reads;
}

for (const [screen, address] of [
  ['Menu', `/table/${TABLE}`],
  ['Cart', `/table/${TABLE}/cart`],
  ['My orders', `/table/${TABLE}/orders`],
]) {
  test(`${screen}: a close clears everything and shows the card within 2 seconds`, async ({ page, request }) => {
    await openMenuReady(page, TABLE);
    await add(page, 'coffee');
    await liveReady(page, () => page.goto(address));
    await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');

    const started = Date.now();
    await closeTable(request, TABLE);
    await expect(page.getByTestId('table-closed')).toContainText(CLOSED_WORDS, { timeout: LIVE_LIMIT_MS });
    expect(Date.now() - started).toBeLessThanOrEqual(LIVE_LIMIT_MS);
    await expect(page.getByTestId('table-closed')).toContainText('Your cart and orders have been cleared.');
    await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
    await expect(page.getByTestId('tab-bar')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
  });
}

test('the card stays and no visit starts until a tab press, which adopts the new visit', async ({ page, request }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await add(page, 'coffee');
  const closedVisit = await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });

  const reads = countTableReads(page);
  await page.waitForTimeout(500);
  expect(reads.count).toBe(0);
  const board = await (await request.get('/api/tables')).json();
  expect(board.tables.find((table: { id: number }) => table.id === TABLE).visitId).toBeNull();

  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
  expect(reads.count).toBe(1);
  const next = await (await request.get('/api/tables')).json();
  const visit = next.tables.find((table: { id: number }) => table.id === TABLE).visitId;
  expect(visit).not.toBeNull();
  expect(visit).not.toBe(closedVisit);
});

test('pressing the tab already showing also starts the next visit', async ({ page, request }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await page.getByTestId('tab-menu').click();
  await expect(page.locator('article.item')).toHaveCount(12);
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
});

test('a refresh starts the next visit, and the new visit stays open after the tabs change', async ({ page, request }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await add(page, 'coffee');
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await page.reload();
  await expect(page.locator('article.item')).toHaveCount(12);
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
  await page.getByTestId('tab-my-orders').click();
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
});

test('a table.closed for an earlier visit does not wipe a new cart', async ({ page, request }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await add(page, 'coffee');
  await request.post('/api/test/events', { data: { type: 'table.closed', tableId: TABLE, visitId: 'an-earlier-visit' } });
  await page.waitForTimeout(500);
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');
});

test('a close missed while the connection was down is found on reconnect, through the board read only', async ({ page, request }) => {
  const server = createOwnServer('closed');
  try {
    await server.start();
    await liveReady(page, async () => {
      await page.goto(`${server.url}/table/${TABLE}`);
      await expect(page.getByTestId('menu-pills')).toBeVisible();
    });
    await add(page, 'coffee');

    await server.stop();
    await expect(page.getByTestId('reconnecting')).toBeVisible();
    const reads = countTableReads(page);
    archiveOpenVisit(TABLE, server.dbFile);
    await server.start();

    await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
    expect(reads.count).toBe(0);
    await signIn(page.context(), server.url);
    const board = await (await request.get(`${server.url}/api/tables`)).json();
    expect(board.tables.find((table: { id: number }) => table.id === TABLE).visitId).toBeNull();
  } finally {
    await server.remove();
  }
});

test('a close missed while changing tabs is found by the next screen\'s check', async ({ page }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await add(page, 'coffee');
  archiveOpenVisit(TABLE);
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
});

test('placing on a closed table resets the device, with no order', async ({ page, request }) => {
  await page.route('**/api/events*', (route) => route.abort());
  await page.route('**/api/tables/*/visit', (route) => route.abort());
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  archiveOpenVisit(TABLE);
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('table-closed')).toBeVisible();
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
  const next = await visitOf(request, TABLE);
  const { orders } = await (await request.get(`/api/tables/${TABLE}/orders`)).json();
  expect(next).toBeTruthy();
  expect(orders).toEqual([]);
});

test('orders on the screen are cleared and do not return for the next visit', async ({ page, request }) => {
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await liveReady(page, () => page.goto(`/table/${TABLE}/orders`));
  await expect(page.locator('article.card')).toHaveCount(1);
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await page.getByTestId('tab-my-orders').click();
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  await expect(page.locator('article.card')).toHaveCount(0);
});

test('a tab press on a healthy connection never shows the reconnecting notice', async ({ page }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await page.route('**/api/events*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('reconnecting')).toHaveCount(0);
});

test('a failed restart offers Try again, and that adopts the new visit', async ({ page, request }) => {
  await liveReady(page, () => openMenuReady(page, TABLE));
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await page.route(`**/api/tables/${TABLE}`, (route) => route.abort(), { times: 1 });
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('table-error-retry').click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await page.getByTestId('tab-my-orders').click();
  await expect(page.locator('article.card')).toHaveCount(1);
});

test('a placement answered after the close keeps the closed card', async ({ page, request }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await liveReady(page, () => page.getByTestId('tab-cart').click());
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  let reached = () => {};
  const atServer = new Promise<void>((resolve) => { reached = resolve; });
  await page.route(`**/api/tables/${TABLE}/orders`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    reached();
    await held;
    return route.fulfill({ response });
  });
  await page.getByTestId('cart-place-order').click();
  await atServer;
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  release();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('table-closed')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/cart$`));
});

test('a cart saved under a closed visit is gone when the table is opened again', async ({ page, request }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.goto('about:blank');
  await closeTable(request, TABLE);
  await page.goto(`/table/${TABLE}/cart`);
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
});
