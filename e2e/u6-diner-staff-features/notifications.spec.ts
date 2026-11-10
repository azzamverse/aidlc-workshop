import { expect, test } from '../staff-login';
import { archiveOpenVisit, moveByApi, openBoardLive, placeByApi, waitSeen } from './helpers';

const TABLE = 6;
const COFFEE = [{ itemId: 'coffee', quantity: 1 }];
const banner = 'ready-banner';

test.beforeEach(() => archiveOpenVisit(TABLE));

async function complete(request, orderId: string) {
  await moveByApi(request, orderId, 'Pending', 'Preparing');
  await moveByApi(request, orderId, 'Preparing', 'Completed');
}

test('an order becoming Completed shows a banner naming it, on any diner screen', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/cart`);
  await waitSeen(page, TABLE, order.id, 'Pending');
  await complete(request, order.id);
  await expect(page.getByTestId(banner)).toHaveText(new RegExp(`Order #${order.number} is ready`), { timeout: 2000 });
});

test('a dismissed banner does not return on reload', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}`);
  await waitSeen(page, TABLE, order.id, 'Pending');
  await complete(request, order.id);
  await page.getByTestId('ready-banner-dismiss').click();
  await expect(page.getByTestId(banner)).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('menu-pills')).toBeVisible();
  await expect(page.getByTestId(banner)).toHaveCount(0);
});

test('orders that finished while away share one banner', async ({ page, request }) => {
  const first = await placeByApi(request, TABLE, COFFEE);
  const second = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await waitSeen(page, TABLE, second.id, 'Pending');
  await page.goto('about:blank');
  await complete(request, first.id);
  await complete(request, second.id);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(banner)).toHaveText(/2 orders are ready/);
  await expect(page.getByTestId(banner)).toHaveCount(1);
});

test('a device that never saw the orders shows no banner', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await complete(request, order.id);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-${order.number}`)).toBeVisible();
  await waitSeen(page, TABLE, order.id, 'Completed');
  await expect(page.getByTestId(banner)).toHaveCount(0);
});

test('a browser that refuses sound and vibration still shows the banner, with no error', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.AudioContext = class { constructor() { throw new Error('blocked'); } } as unknown as typeof AudioContext;
    Object.defineProperty(navigator, 'vibrate', { value: () => { throw new Error('blocked'); } });
  });
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}`);
  await waitSeen(page, TABLE, order.id, 'Pending');
  await complete(request, order.id);
  await expect(page.getByTestId(banner)).toBeVisible();
  expect(errors).toEqual([]);
});

test('mute stops vibration, not the banner, and survives a reload', async ({ page, request }) => {
  await page.addInitScript(() => {
    (window as unknown as { buzzes: number }).buzzes = 0;
    Object.defineProperty(navigator, 'vibrate', { value: () => { (window as unknown as { buzzes: number }).buzzes += 1; return true; } });
  });
  const buzzes = () => page.evaluate(() => (window as unknown as { buzzes: number }).buzzes);
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await page.getByTestId('mute-switch').click();
  await expect(page.getByTestId('mute-switch')).toHaveText('Unmute');
  await page.reload();
  await expect(page.getByTestId('mute-switch')).toHaveText('Unmute');
  await waitSeen(page, TABLE, order.id, 'Pending');
  await complete(request, order.id);
  await expect(page.getByTestId(banner)).toBeVisible();
  expect(await buzzes()).toBe(0);
});

test('an unmuted device vibrates with the banner', async ({ page, request }) => {
  await page.addInitScript(() => {
    (window as unknown as { buzzes: number }).buzzes = 0;
    Object.defineProperty(navigator, 'vibrate', { value: () => { (window as unknown as { buzzes: number }).buzzes += 1; return true; } });
  });
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}`);
  await waitSeen(page, TABLE, order.id, 'Pending');
  await complete(request, order.id);
  await expect(page.getByTestId(banner)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { buzzes: number }).buzzes)).toBe(1);
});

test('a new order alerts the board, naming the table and number, and can be dismissed', async ({ page, request }) => {
  await openBoardLive(page);
  const order = await placeByApi(request, TABLE, COFFEE);
  const alert = page.getByTestId(`kitchen-alert-${order.number}`);
  await expect(alert).toContainText(`New order #${order.number} at Table ${TABLE}`, { timeout: 2000 });
  await page.getByTestId(`kitchen-alert-dismiss-${order.number}`).click();
  await expect(alert).toHaveCount(0);
});

test('the kitchen mute survives a reload and still shows alerts', async ({ page, request }) => {
  await openBoardLive(page);
  await page.getByTestId('mute-switch').click();
  await page.reload();
  await expect(page.getByTestId('staff-live')).toHaveText(/Live/);
  await expect(page.getByTestId('mute-switch')).toHaveText('Unmute');
  const order = await placeByApi(request, TABLE, COFFEE);
  await expect(page.getByTestId(`kitchen-alert-${order.number}`)).toBeVisible();
});
