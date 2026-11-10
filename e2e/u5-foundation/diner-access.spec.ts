import { expect, test } from '@playwright/test';
import { add, archiveOpenVisit, openMenuReady, placeByApi } from '../u2-diner-screens/helpers';

const TABLE = 7;
const OTHER_TABLE = 9;

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(() => {
  archiveOpenVisit(TABLE);
  archiveOpenVisit(OTHER_TABLE);
});

test('a diner orders with no PIN and never asks for the all-tables board', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => asked.push(new URL(request.url()).pathname));
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
  expect(asked).not.toContain('/api/tables');
  expect(asked).toContain(`/api/tables/${TABLE}/visit`);
});

test('another table\'s new order never reaches this diner\'s screen', async ({ page, request }) => {
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  await placeByApi(request, OTHER_TABLE, [{ itemId: 'lemonade', quantity: 1 }]);
  await page.waitForTimeout(500);
  await expect(page.getByTestId('orders-empty')).toBeVisible();
});

test('this diner\'s own order shows live', async ({ page, request }) => {
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  const order = await placeByApi(request, TABLE, [{ itemId: 'lemonade', quantity: 1 }]);
  await expect(page.getByTestId(`order-${order.number}`)).toBeVisible();
});

test('staff requests answer 401 from a browser with no session', async ({ request }) => {
  expect((await request.get('/api/tables')).status()).toBe(401);
  expect((await request.get('/api/events')).status()).toBe(401);
  expect((await request.post('/api/tables/1/close')).status()).toBe(401);
});

test('the My orders pills swap views, each loading its own file only when opened', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => scripts.push(new URL(request.url()).pathname));
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId('orders-empty')).toBeVisible();
  expect(scripts.some((path) => path.includes('LivingTable'))).toBe(false);

  for (const [pill, slot, file] of [
    ['table', 'slot-living-table', 'LivingTable'],
    ['kitchen', 'slot-kitchen-theatre', 'KitchenTheatre'],
    ['bottle', 'slot-spin-the-bottle', 'SpinTheBottle'],
  ]) {
    await page.getByTestId(`orders-view-${pill}`).click();
    await expect(page.getByTestId(slot)).toContainText('coming soon');
    expect(scripts.some((path) => path.includes(file))).toBe(true);
    await expect(page.getByTestId(`orders-view-${pill}`)).toHaveAttribute('aria-pressed', 'true');
  }

  await page.getByTestId('orders-view-orders').click();
  await expect(page.getByTestId('orders-empty')).toBeVisible();
});

test('the Menu\'s Chef\'s Dice button opens its slot', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.getByTestId('slot-chefs-dice')).toHaveCount(0);
  await page.getByTestId('menu-chefs-dice').click();
  await expect(page.getByTestId('slot-chefs-dice')).toContainText('coming soon');
  await expect(page.getByTestId('menu-chefs-dice')).toHaveAttribute('aria-expanded', 'true');
});
