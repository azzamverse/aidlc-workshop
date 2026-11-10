import { whenRequestSent } from '../timing';
import { expect, test, type Page } from '../staff-login';
import { archiveOpenVisit, cancelByApi, LIVE_LIMIT_MS, moveByApi, openBoardLive, placeByApi } from './helpers';

const TABLE = 7;
const coffee = [{ itemId: 'coffee', quantity: 1 }];
const card = (page: Page, number: number) => page.getByTestId(`board-order-${number}`);

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test('Pending moves to Preparing to Completed, and then nothing is offered', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  const button = page.getByTestId(`board-move-${order.number}`);
  await expect(button).toHaveText('Start preparing');
  await button.click();
  await expect(card(page, order.number).locator('.status')).toHaveText(/Preparing/);
  await expect(card(page, order.number).locator('.new-tag')).toHaveCount(0);
  await expect(button).toHaveText('Mark completed');
  await button.click();
  await expect(card(page, order.number).locator('.status')).toHaveText(/Completed/);
  await expect(button).toHaveCount(0);
});

test('a move reaches a diner\'s screen within 2 seconds', async ({ page, browser, baseURL, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  const diner = await (await browser.newContext({ baseURL })).newPage();
  const ready = diner.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/visit'));
  await diner.goto(`/table/${TABLE}/orders`);
  await ready;
  await openBoardLive(page);
  const sent = whenRequestSent(page, 'PUT', '/status');
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(diner.getByTestId(`order-${order.number}`).locator('.status')).toHaveText(/Preparing/, { timeout: LIVE_LIMIT_MS });
  const arrived = Date.now();
  expect(arrived - (await sent)).toBeLessThanOrEqual(LIVE_LIMIT_MS);
  await diner.context().close();
});

test('the button is disabled while its request runs', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  let sent: unknown;
  await page.route('**/status', async (route) => {
    sent = route.request().postDataJSON();
    await held;
    await route.continue();
  });
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(page.getByTestId(`board-move-${order.number}`)).toBeDisabled();
  expect(sent).toEqual({ from: 'Pending', to: 'Preparing' });
  release();
  await expect(card(page, order.number).locator('.status')).toHaveText(/Preparing/);
});

test('a move refused after a diner\'s cancel shows Cancelled and says so', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  // The cancel lands just before the move reaches the server.
  await page.route('**/status', async (route) => {
    await cancelByApi(request, TABLE, order.id);
    await route.continue();
  });
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(page.getByTestId('board-message')).toContainText(`Order #${order.number} was just cancelled by the diner, so it can't be moved on.`);
  await expect(card(page, order.number).locator('.status')).toHaveText(/Cancelled/);
  await expect(page.getByTestId(`board-move-${order.number}`)).toHaveCount(0);
});

test('a move refused because another screen moved it first uses the general sentence', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await moveByApi(request, order.id, 'Pending', 'Preparing');
  await openBoardLive(page);
  await page.route('**/status', async (route) => {
    await moveByApi(request, order.id, 'Preparing', 'Completed');
    await route.continue();
  });
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(page.getByTestId('board-message')).toContainText(`Order #${order.number} is already completed, so it can't be moved on.`);
  await expect(card(page, order.number).locator('.status')).toHaveText(/Completed/);
});

test('any other failure leaves the order as it was and says so', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await page.route('**/status', (route) => route.abort());
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(page.getByTestId('board-message')).toContainText(`We couldn't update Order #${order.number}. Please try again.`);
  await expect(card(page, order.number).locator('.status')).toHaveText(/Pending/);
  await expect(page.getByTestId(`board-move-${order.number}`)).toBeEnabled();
});

test('a refusal with no current status leaves the board showing and says so', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await page.route(`**/api/orders/${order.id}/status`, (route) =>
    route.fulfill({ status: 409, json: { error: { code: 'ORDER_STATE_CONFLICT', message: 'Refused.' } } }));
  await page.getByTestId(`board-move-${order.number}`).click();
  await expect(page.getByTestId('board-message')).toContainText(`We couldn't update Order #${order.number}. Please try again.`);
  await expect(card(page, order.number).locator('.status')).toHaveText(/Pending/);
});

test('a Cancelled order stays on the board with its word and icon', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  await expect(card(page, order.number)).toBeVisible();
  await cancelByApi(request, TABLE, order.id);
  await expect(card(page, order.number).locator('.status')).toHaveText(/Cancelled/, { timeout: LIVE_LIMIT_MS });
  await expect(card(page, order.number).locator('.status [aria-hidden="true"]')).toHaveText('✕');
  await expect(card(page, order.number).locator('.new-tag')).toHaveCount(0);
});

test('regression: a move keeps keyboard focus on its button, so the next move needs only Enter', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  const button = page.getByTestId(`board-move-${order.number}`);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveText('Mark completed');
  await expect(button).toBeEnabled();
  await expect(button).toBeFocused();
});

test('the keyboard moves an order and follows "Open bill"', async ({ page, request }) => {
  const order = await placeByApi(request, TABLE, coffee);
  await openBoardLive(page);
  const button = page.getByTestId(`board-move-${order.number}`);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(card(page, order.number).locator('.status')).toHaveText(/Preparing/);
  await page.getByTestId(`board-open-bill-${TABLE}`).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/staff/tables/${TABLE}$`));
});
