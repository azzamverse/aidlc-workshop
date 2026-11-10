import { watchArrival, whenRequestSent } from '../timing';
import { expect, signIn, test } from '../staff-login';
import { cancelByApi, coffee, completeByApi, createOwnServer, LIVE_LIMIT_MS, placeByApi, resetTable } from './helpers';

const TABLE = 10;
const address = `/staff/tables/${TABLE}`;

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ request }) => resetTable(request, TABLE));

test('a close with no answer says it is unconfirmed and shows where the bill stands', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  await page.route(`**/api/tables/${TABLE}/close`, async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-message')).toContainText("We couldn't confirm the close.");
  await expect(page.getByTestId('bill-empty')).toBeVisible();
});

test('closing moves focus to the message, which stays until Back to board, and the table is empty', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-closed')).toContainText(`Table ${TABLE} closed. It's ready for the next diner.`);
  await expect(page.getByTestId('bill-closed')).toBeFocused();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('bill-closed')).toBeVisible();
  await page.getByTestId('bill-back-to-board').click();
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByTestId(`board-table-${TABLE}`)).toContainText('No orders');
  const bill = await (await request.get(`/api/tables/${TABLE}/bill`)).json();
  expect(bill).toMatchObject({ orders: [], totalCents: 0, canClose: false });
});

test('a table with only cancelled orders closes with a total of zero', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await cancelByApi(request, TABLE, order.id);
  await page.goto(address);
  await expect(page.getByTestId('bill-empty')).toContainText('Table total $0.00');
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'false');
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-closed')).toBeVisible();
});

test('a repeat close changes nothing and succeeds', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'false');
  // The press lands after another screen's close: the server answers success either way.
  await page.route('**/close', async (route) => {
    expect((await request.post(`/api/tables/${TABLE}/close`)).status()).toBe(200);
    await route.continue();
  });
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-closed')).toBeVisible();
  await expect(page.getByTestId('bill-message')).toHaveCount(0);
});

test('a refused close from a stale screen shows the server\'s message and reads the bill again', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'false');
  let later: { number: number } | undefined;
  await page.route('**/close', async (route) => {
    later = await placeByApi(request, TABLE, coffee);
    await route.continue();
  });
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-message')).toContainText('cannot be closed');
  await expect(page.getByTestId(`bill-order-${later?.number}`)).toBeVisible();
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'true');
});

test('any other failed close says so and keeps the bill', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  await expect(page.getByTestId('bill-close')).toBeVisible();
  await page.route('**/close', (route) => route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } } }));
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-message')).toContainText("We couldn't close this table. Please try again.");
  await expect(page.getByTestId(`bill-order-${order.number}`)).toBeVisible();
});

test('the real close reaches an open diner screen and the board within 2 seconds', async ({ page, browser, baseURL, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  const diner = await (await browser.newContext({ baseURL })).newPage();
  const boardContext = await browser.newContext({ baseURL });
  await signIn(boardContext, baseURL);
  const board = await boardContext.newPage();
  const ready = diner.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/visit'));
  await diner.goto(`/table/${TABLE}/orders`);
  await ready;
  await board.goto('/staff');
  await expect(board.getByTestId('staff-live')).toHaveText(/Live/);
  await expect(board.getByTestId(`board-order-${order.number}`)).toBeVisible();
  await page.goto(address);

  const dinerArrival = await watchArrival(diner, '[data-testid="table-closed"]');
  const boardArrival = await watchArrival(board, `[data-testid="board-order-${order.number}"]`, { gone: true });
  const sent = whenRequestSent(page, 'POST', '/close');
  await page.getByTestId('bill-close').click();
  await expect(diner.getByTestId('table-closed')).toBeVisible();
  await expect(board.getByTestId(`board-order-${order.number}`)).toHaveCount(0);
  const arrived = Math.max(await dinerArrival(), await boardArrival());
  expect(arrived - (await sent)).toBeLessThanOrEqual(LIVE_LIMIT_MS);
  await diner.context().close();
  await board.context().close();
});

test('a device offline during the close finds out when it reconnects, and no visit starts', async ({ page, request }) => {
  const server = createOwnServer('close');
  try {
    await server.start();
    await signIn(page.context(), server.url);
    const order = await placeByApi(request, TABLE, coffee, server.url);
    await completeByApi(request, order.id, server.url);
    const ready = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/visit'));
    await page.goto(`${server.url}/table/${TABLE}/orders`);
    await ready;

    // The device's stream cannot come back until the route is lifted.
    await page.route('**/api/events*', (route) => route.abort());
    await server.stop();
    await expect(page.getByTestId('reconnecting')).toBeVisible();
    await server.start();
    await signIn(page.context(), server.url);
    expect((await request.post(`${server.url}/api/tables/${TABLE}/close`)).status()).toBe(200);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('table-closed')).toHaveCount(0);

    await page.unroute('**/api/events*');
    await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: 15_000 });
    const board = await (await request.get(`${server.url}/api/tables`)).json();
    expect(board.tables.find((table: { id: number }) => table.id === TABLE).visitId).toBeNull();
  } finally {
    await server.remove();
  }
});

test('the keyboard closes the table, and focus stays on the button while it runs', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(address);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/close', async (route) => {
    await held;
    await route.continue();
  });
  const button = page.getByTestId('bill-close');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-disabled', 'true');
  await expect(button).toBeFocused();
  release();
  await expect(page.getByTestId('bill-closed')).toBeVisible();
});
