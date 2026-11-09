import { expect, test } from '@playwright/test';
import { cancelByApi, coffee, completeByApi, createOwnServer, LIVE_LIMIT_MS, moveByApi, placeByApi, resetTable } from './helpers';

const TABLE = 9;
const address = `/staff/tables/${TABLE}`;

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ request }) => resetTable(request, TABLE));

test('the total is right to the cent, with lines, subtotals and open orders counted', async ({ page, request }) => {
  const first = await placeByApi(request, TABLE, [{ itemId: 'tomato-soup', quantity: 1 }, { itemId: 'coffee', quantity: 3 }]);
  await completeByApi(request, first.id);
  await placeByApi(request, TABLE, [{ itemId: 'garlic-bread', quantity: 7 }]);
  await page.goto(address);
  const card = page.getByTestId(`bill-order-${first.number}`);
  await expect(card.locator('tbody tr').nth(1).locator('td')).toHaveText(['Coffee', '3', '$2.50', '$7.50']);
  await expect(card.locator('tfoot')).toContainText('$13.00');
  await expect(page.getByTestId('bill-total')).toHaveText('$44.50');
});

test('cancelled orders are left off, oldest first for the rest', async ({ page, request }) => {
  const kept = await placeByApi(request, TABLE, coffee);
  const gone = await placeByApi(request, TABLE, [{ itemId: 'margherita-pizza', quantity: 1 }]);
  const later = await placeByApi(request, TABLE, coffee);
  await cancelByApi(request, TABLE, gone.id);
  await page.goto(address);
  await expect(page.locator('section.card h2')).toHaveText([`Order #${kept.number}`, `Order #${later.number}`]);
  await expect(page.getByTestId('bill-total')).toHaveText('$5.00');
});

test('open orders are named, and Close table is unavailable with its reason', async ({ page, request }) => {
  const preparing = await placeByApi(request, TABLE, coffee);
  await moveByApi(request, preparing.id, 'Pending', 'Preparing');
  const pending = await placeByApi(request, TABLE, coffee);
  await page.goto(address);
  await expect(page.getByTestId('bill-still-open')).toContainText(`Still open: #${preparing.number} Preparing, #${pending.number} Pending. The table can be closed once these are finished.`);
  await expect(page.getByTestId('bill-reason')).toContainText(`Close table is available once #${preparing.number} and #${pending.number} are finished.`);
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'true');
  await page.getByTestId('bill-close').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await expect(page.getByTestId('bill-closed')).toHaveCount(0);
  await expect(page.getByTestId(`bill-order-${pending.number}`)).toBeVisible();
});

test('no visit shows the empty bill, $0.00 and starts no visit', async ({ page, request }) => {
  await page.goto(address);
  await expect(page.getByTestId('bill-empty')).toContainText('No orders for this table');
  await expect(page.getByTestId('bill-empty')).toContainText('Table total $0.00');
  await expect(page.getByTestId('bill-close')).toHaveAttribute('aria-disabled', 'true');
  const board = await (await request.get('/api/tables')).json();
  expect(board.tables.find((table: { id: number }) => table.id === TABLE).visitId).toBeNull();
});

test('skeleton, then the error with Try again', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/bill', async (route) => {
    await held;
    await route.abort();
  });
  await page.goto(address);
  await expect(page.getByTestId('bill-loading').locator('.skeleton')).toBeVisible();
  release();
  await expect(page.getByTestId('bill-error')).toContainText("We couldn't load this bill. Please try again.");
  await page.unroute('**/bill');
  await page.getByTestId('bill-error-retry').click();
  await expect(page.getByTestId('bill-empty')).toBeVisible();
  await expect(page.getByTestId('bill-error')).toHaveCount(0);
});

test('an unknown table says so', async ({ page }) => {
  for (const unknown of ['/staff/tables/99', '/staff/tables/abc']) {
    await page.goto(unknown);
    await expect(page.getByTestId('bill-not-found')).toContainText('Table not found');
    await expect(page.getByTestId('bill-close')).toHaveCount(0);
  }
});

test('the open bill stays current with no refresh', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await page.goto(address);
  await expect(page.getByTestId(`bill-order-${order.number}`)).toBeVisible();
  await page.waitForTimeout(300);
  const second = await placeByApi(request, TABLE, coffee);
  await expect(page.getByTestId(`bill-order-${second.number}`)).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await expect(page.getByTestId('bill-total')).toHaveText('$5.00');
  await moveByApi(request, order.id, 'Pending', 'Preparing');
  await expect(page.getByTestId(`bill-order-${order.number}`).locator('.status')).toHaveText(/Preparing/, { timeout: LIVE_LIMIT_MS });
});

test('a lost connection shows the notice and the bill catches up', async ({ page, request }) => {
  const server = createOwnServer('bill');
  try {
    await server.start();
    const order = await placeByApi(request, TABLE, coffee, server.url);
    await page.goto(`${server.url}${address}`);
    await expect(page.getByTestId(`bill-order-${order.number}`)).toBeVisible();
    await page.waitForTimeout(300);
    await server.stop();
    await expect(page.getByTestId('bill-reconnecting')).toContainText('Reconnecting…');
    await server.start();
    await moveByApi(request, order.id, 'Pending', 'Preparing', server.url);
    await expect(page.getByTestId(`bill-order-${order.number}`).locator('.status')).toHaveText(/Preparing/, { timeout: 15_000 });
    await expect(page.getByTestId('bill-reconnecting')).toHaveCount(0);
  } finally {
    await server.remove();
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no transition runs', async ({ page, request }) => {
    await placeByApi(request, TABLE, coffee);
    await page.goto(address);
    await expect(page.getByTestId('bill-close')).toBeVisible();
    expect(await page.getByTestId('bill-close').evaluate((button) => getComputedStyle(button).transitionDuration)).toBe('0s');
  });
});
