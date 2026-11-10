import { expect, test } from '../staff-login';
import { archiveOpenVisit, finishAllOpenOrders, moveByApi, placeByApi } from './helpers';

const TABLE = 3;
const OTHER_TABLE = 2;
const COFFEE = [{ itemId: 'coffee', quantity: 1 }];

test.beforeEach(() => {
  archiveOpenVisit(TABLE);
  archiveOpenVisit(OTHER_TABLE);
  finishAllOpenOrders();
});

const filled = (page, number) => page.getByTestId(`order-tracker-${number}`).locator('.seg.on');

test('the bar and the step follow the order live, with no refresh', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(filled(page, order.number)).toHaveCount(1);
  const card = page.getByTestId(`order-${order.number}`);
  await expect(card.locator('.status')).toContainText('Pending');

  await moveByApi(request, order.id, 'Pending', 'Preparing');
  await expect(filled(page, order.number)).toHaveCount(2, { timeout: 2000 });
  await expect(card.locator('.status')).toContainText('Preparing', { timeout: 2000 });

  await moveByApi(request, order.id, 'Preparing', 'Completed');
  await expect(filled(page, order.number)).toHaveCount(3, { timeout: 2000 });
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toHaveCount(0);
});

test('regression: the estimate is not styled as a second price on the order card', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toBeVisible();
  await expect(page.getByTestId(`order-${order.number}`).locator('.price')).toHaveCount(1);
});

test('with no earlier open orders it reads About 10 min',async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toHaveText('About 10 min');
});

test('two earlier open orders across all tables read About 16 min', async ({ page, request }) => {
  await placeByApi(request, OTHER_TABLE, COFFEE);
  await placeByApi(request, OTHER_TABLE, COFFEE);
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toHaveText('About 16 min');
});

test('the estimate drops when an earlier order finishes', async ({ page, request }) => {
  const earlier = await placeByApi(request, OTHER_TABLE, COFFEE);
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toHaveText('About 13 min');
  await moveByApi(request, earlier.id, 'Pending', 'Preparing');
  await moveByApi(request, earlier.id, 'Preparing', 'Completed');
  await expect(page.getByTestId(`order-estimate-${order.number}`)).toHaveText('About 10 min', { timeout: 2000 });
});

test('a Cancelled order shows the word and no bar', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  await page.getByTestId(`order-cancel-${order.number}`).click();
  await expect(page.getByTestId(`order-${order.number}`).locator('.status')).toContainText('Cancelled');
  await expect(page.getByTestId(`order-tracker-${order.number}`)).toHaveCount(0);
});

test('under reduced motion the bar does not animate', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const order = await placeByApi(request, TABLE, COFFEE);
  await page.goto(`/table/${TABLE}/orders`);
  const segment = page.getByTestId(`order-tracker-${order.number}`).locator('.seg').first();
  await expect(segment).toBeVisible();
  expect(await segment.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
});
