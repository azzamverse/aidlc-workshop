import { expect, test } from '../staff-login';
import { archiveOpenVisit, closeTable, openBoardLive, openMenuReady } from './helpers';

const TABLE = 9;

test.beforeEach(() => archiveOpenVisit(TABLE));

const waitingOf = async (request) => (await (await request.get(`/api/tables/${TABLE}/requests`)).json()).requests;

test('Call the waiter pulses the card in words within 2 seconds, and after a reload', async ({ page, context }) => {
  const board = await context.newPage();
  await openBoardLive(board);
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-waiter').click();
  const card = board.getByTestId(`board-table-${TABLE}`);
  await expect(card).toHaveClass(/pulse/, { timeout: 2000 });
  await expect(board.getByTestId(`board-request-${TABLE}-waiter`)).toContainText('Waiter called');
  await board.reload();
  await expect(board.getByTestId(`board-table-${TABLE}`)).toHaveClass(/pulse/);
});

test('a repeat makes no second request and the button says staff have been told', async ({ page, request }) => {
  await openMenuReady(page, TABLE);
  const button = page.getByTestId('request-waiter');
  await button.click();
  await expect(button).toContainText('staff told');
  await button.click();
  await expect(button).toContainText('staff told');
  expect(await waitingOf(request)).toHaveLength(1);
});

test('waiter and bill wait together, and Respond clears only one', async ({ page, context, request }) => {
  const board = await context.newPage();
  await openBoardLive(board);
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-waiter').click();
  await page.getByTestId('request-bill').click();
  await expect(board.getByTestId(`board-request-${TABLE}-bill`)).toContainText('Bill requested');
  await expect(board.getByTestId(`board-request-${TABLE}-waiter`)).toBeVisible();

  await board.getByTestId(`board-respond-${TABLE}-waiter`).click();
  await expect(board.getByTestId(`board-request-${TABLE}-waiter`)).toHaveCount(0, { timeout: 2000 });
  await expect(board.getByTestId(`board-request-${TABLE}-bill`)).toBeVisible();
  await expect(page.getByTestId('request-waiter')).toHaveText('Call the waiter', { timeout: 2000 });
  await expect(page.getByTestId('request-bill')).toContainText('staff told');
  await expect(board.getByTestId(`board-table-${TABLE}`)).toHaveClass(/pulse/);
  expect(await waitingOf(request)).toHaveLength(1);
});

test('answering the last request stops the pulse', async ({ page, context }) => {
  const board = await context.newPage();
  await openBoardLive(board);
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-bill').click();
  await board.getByTestId(`board-respond-${TABLE}-bill`).click();
  await expect(board.getByTestId(`board-table-${TABLE}`)).not.toHaveClass(/pulse/, { timeout: 2000 });
});

test('closing the table clears the requests and the diner\'s buttons go', async ({ page, context, request }) => {
  const board = await context.newPage();
  await openBoardLive(board);
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-waiter').click();
  await expect(board.getByTestId(`board-request-${TABLE}-waiter`)).toBeVisible();
  await closeTable(request, TABLE);
  await expect(board.getByTestId(`board-table-${TABLE}`)).not.toHaveClass(/pulse/);
  await expect(page.getByTestId('table-closed')).toBeVisible();
  await expect(page.getByTestId('request-waiter')).toHaveCount(0);
});

test('a failed press shows a plain message and the button can be tried again', async ({ page }) => {
  await page.route(`**/api/tables/${TABLE}/requests`, (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } } });
  });
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-waiter').click();
  await expect(page.getByTestId('request-message')).toContainText("We couldn't reach the staff");
  await expect(page.getByTestId('request-waiter')).toHaveText('Call the waiter');
  await page.unroute(`**/api/tables/${TABLE}/requests`);
  await page.getByTestId('request-waiter').click();
  await expect(page.getByTestId('request-waiter')).toContainText('staff told');
  await expect(page.getByTestId('request-message')).toHaveCount(0);
});

test('under reduced motion the card shows the request without animating', async ({ page, context }) => {
  const board = await context.newPage();
  await board.emulateMedia({ reducedMotion: 'reduce' });
  await openBoardLive(board);
  await openMenuReady(page, TABLE);
  await page.getByTestId('request-waiter').click();
  const card = board.getByTestId(`board-table-${TABLE}`);
  await expect(card).toHaveClass(/pulse/);
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
