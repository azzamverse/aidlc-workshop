import { expect, restartSignedIn, signIn, test } from '../staff-login';
import { archiveOpenVisit, closeTable, createOwnServer, LIVE_LIMIT_MS, moveByApi, openBoardLive, placeByApi } from './helpers';

const TABLE = 6;
const coffee = [{ itemId: 'coffee', quantity: 1 }];

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test('opens with no login: 10 tables, "No orders" and "Open bill", and it starts no visit', async ({ page, request }) => {
  const asked: string[] = [];
  page.on('request', (sent) => asked.push(new URL(sent.url()).pathname));
  await openBoardLive(page);
  await expect(page.getByTestId(`board-table-${TABLE}`)).toContainText('No orders');
  await page.getByTestId(`board-open-bill-${TABLE}`).click();
  await expect(page).toHaveURL(new RegExp(`/staff/tables/${TABLE}$`));
  expect(asked.filter((address) => /^\/api\/tables\/\d+$/.test(address))).toEqual([]);
  const board = await (await request.get('/api/tables')).json();
  expect(board.tables.find((table: { id: number }) => table.id === TABLE).visitId).toBeNull();
});

test('skeleton cards while reading, then an error with Try again, never an empty board', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/tables', async (route) => {
    await held;
    await route.abort();
  });
  await page.goto('/staff');
  await expect(page.getByTestId('board-loading').locator('.skeleton').first()).toBeVisible();
  release();
  await expect(page.getByTestId('board-error')).toContainText("We couldn't load the board.");
  await expect(page.getByTestId('board')).toHaveCount(0);
  await page.unroute('**/api/tables');
  await page.getByTestId('board-error-retry').click();
  await expect(page.getByTestId('board').locator('.table-card')).toHaveCount(10);
  await expect(page.getByTestId('board-error')).toHaveCount(0);
});

test('an order arrives within 2 seconds, newest first, with number, items, status word and icon', async ({ page, request }) => {
  await openBoardLive(page);
  const first = await placeByApi(request, TABLE, coffee);
  const started = Date.now();
  const second = await placeByApi(request, TABLE, [{ itemId: 'cheeseburger', quantity: 2 }]);
  const card = page.getByTestId(`board-order-${second.number}`);
  await expect(card).toBeVisible({ timeout: LIVE_LIMIT_MS });
  expect(Date.now() - started).toBeLessThanOrEqual(LIVE_LIMIT_MS);
  await expect(card).toContainText('2 × Cheeseburger');
  await expect(card.locator('.status')).toHaveText(/Pending/);
  await expect(card.locator('.status [aria-hidden="true"]')).toHaveText('⏳');
  await expect(page.getByTestId(`board-table-${TABLE}`).locator('.order').first()).toHaveAttribute('data-testid', `board-order-${second.number}`);
  await expect(page.getByTestId(`board-order-${first.number}`)).toBeVisible();
});

test('"★ New" shows on every Pending order, after a refresh and on a second screen, and clears on moving', async ({ page, browser, baseURL, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  const otherContext = await browser.newContext({ baseURL });
  await signIn(otherContext, baseURL);
  const other = await otherContext.newPage();
  await openBoardLive(page);
  await openBoardLive(other);
  for (const screen of [page, other]) {
    await expect(screen.getByTestId(`board-order-${order.number}`).locator('.new-tag')).toHaveText('★ New');
  }
  await page.reload();
  await expect(page.getByTestId(`board-order-${order.number}`)).toHaveClass(/new/);
  await expect(page.getByTestId('staff-live')).toHaveText(/Live/);

  await moveByApi(request, order.id, 'Pending', 'Preparing');
  for (const screen of [page, other]) {
    await expect(screen.getByTestId(`board-order-${order.number}`).locator('.new-tag')).toHaveCount(0, { timeout: LIVE_LIMIT_MS });
  }
  await other.context().close();
});

test('a read that started before a change never overwrites it', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await expect(page.getByTestId(`board-order-${order.number}`).locator('.status')).toHaveText(/Pending/);

  // The next read is answered from before the change, and delivered after it.
  let deliver: () => void = () => {};
  const held = new Promise<void>((resolve) => { deliver = resolve; });
  let readAnswered: () => void = () => {};
  const answered = new Promise<void>((resolve) => { readAnswered = resolve; });
  await page.route('**/api/tables', async (route) => {
    const response = await route.fetch();
    readAnswered();
    await held;
    await route.fulfill({ response });
  });
  // Another table's close makes the board read again.
  await request.post('/api/test/events', { data: { type: 'table.closed', tableId: 9, visitId: 'none' } });
  await answered;
  await moveByApi(request, order.id, 'Pending', 'Preparing');
  await expect(page.getByTestId(`board-order-${order.number}`).locator('.status')).toHaveText(/Preparing/, { timeout: LIVE_LIMIT_MS });
  deliver();
  await page.waitForResponse('**/api/tables').catch(() => {});
  await page.waitForTimeout(200);
  await expect(page.getByTestId(`board-order-${order.number}`).locator('.status')).toHaveText(/Preparing/);
});

test('a closed table empties', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await expect(page.getByTestId(`board-order-${order.number}`)).toBeVisible();
  await closeTable(request, TABLE);
  await expect(page.getByTestId(`board-order-${order.number}`)).toHaveCount(0, { timeout: LIVE_LIMIT_MS });
  await expect(page.getByTestId(`board-table-${TABLE}`)).toContainText('No orders');
});

test('a closed table still empties when the reload fails', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await expect(page.getByTestId(`board-order-${order.number}`)).toBeVisible();
  await page.route('**/api/tables', (route) => route.abort());
  await closeTable(request, TABLE);
  await expect(page.getByTestId('board-error')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await expect(page.getByTestId(`board-table-${TABLE}`)).toContainText('No orders');
  await expect(page.getByTestId('board').locator('.table-card')).toHaveCount(10);
});

test('a lost connection shows the notice, and the board catches up by itself', async ({ page, request }) => {
  const server = createOwnServer('board');
  try {
    await server.start();
    await signIn(page.context(), server.url);
    await openBoardLive(page, server.url);
    await server.stop();
    await expect(page.getByTestId('board-reconnecting')).toContainText('Reconnecting… the board will catch up by itself.');
    await expect(page.getByTestId('staff-live')).toHaveText(/Reconnecting…/);
    await restartSignedIn(page, server.start, server.url);
    const order = await placeByApi(request, TABLE, coffee, server.url);
    await expect(page.getByTestId(`board-order-${order.number}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('board-reconnecting')).toHaveCount(0);
    await expect(page.getByTestId('staff-live')).toHaveText(/Live/);
  } finally {
    await server.remove();
  }
});

test.describe('at 1024 px', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('3 columns, no horizontal scroll and no clipped controls', async ({ page, request }) => {
    await placeByApi(request, TABLE, coffee);
    await openBoardLive(page);
    const facts = await page.evaluate(() => ({
      columns: getComputedStyle(document.querySelector('.board') as Element).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clipped: [...document.querySelectorAll('.board .btn')].filter((button) => {
        const box = button.getBoundingClientRect();
        const card = (button.closest('.table-card') as Element).getBoundingClientRect();
        return box.right > card.right || box.left < card.left;
      }).length,
    }));
    expect(facts).toEqual({ columns: 3, overflow: 0, clipped: 0 });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no transition runs', async ({ page, request }) => {
    await placeByApi(request, TABLE, coffee);
    await openBoardLive(page);
    const durations = await page.evaluate(() =>
      ['.order', '.btn', '.skeleton, .order'].map((selector) => getComputedStyle(document.querySelector(selector) as Element).transitionDuration),
    );
    expect(durations).toEqual(['0s', '0s', '0s']);
  });
});
