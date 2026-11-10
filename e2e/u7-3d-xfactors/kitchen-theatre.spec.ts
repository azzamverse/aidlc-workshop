import { expect, test } from '@playwright/test';
import { signIn } from '../staff-login';
import { archiveOpenVisit, cancelByApi, LIVE_LIMIT_MS, moveByApi, placeByApi } from '../u2-diner-screens/helpers';
import { disableWebGL, openView, watchErrors } from './helpers';

const TABLE = 6;
const OTHER_TABLE = 8;

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(() => {
  archiveOpenVisit(TABLE);
  archiveOpenVisit(OTHER_TABLE);
});

test('a ticket moves along the rail as its order moves, in words', async ({ page, context, request }) => {
  const errors = watchErrors(page);
  await signIn(context);
  const order = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await openView(page, TABLE, 'kitchen');
  const ticket = (station: string) => page.getByTestId(`kitchen-station-${station}`).getByTestId(`kitchen-ticket-${order.number}`);

  await expect(ticket('rail-start')).toHaveText(`#${order.number} Pending`);
  await moveByApi(context.request, order.id, 'Pending', 'Preparing');
  await expect(ticket('stove')).toHaveText(`#${order.number} Preparing`, { timeout: LIVE_LIMIT_MS });
  await moveByApi(context.request, order.id, 'Preparing', 'Completed');
  await expect(ticket('pass')).toHaveText(`#${order.number} Completed`, { timeout: LIVE_LIMIT_MS });
  expect(errors).toEqual([]);
});

test('a cancelled order has no ticket, and another table\'s order never shows', async ({ page, request }) => {
  const mine = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  const cancelled = await placeByApi(request, TABLE, [{ itemId: 'lemonade', quantity: 1 }]);
  await cancelByApi(request, TABLE, cancelled.id);
  const others = await placeByApi(request, OTHER_TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await openView(page, TABLE, 'kitchen');
  await expect(page.getByTestId(`kitchen-ticket-${mine.number}`)).toBeVisible();
  await expect(page.getByTestId(`kitchen-ticket-${cancelled.number}`)).toHaveCount(0);
  await expect(page.getByTestId(`kitchen-ticket-${others.number}`)).toHaveCount(0);
});

test('with no 3D the stations and tickets still show as text', async ({ page, request }) => {
  await disableWebGL(page);
  const order = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await openView(page, TABLE, 'kitchen');
  await expect(page.getByTestId('scene-fallback')).toBeVisible();
  await expect(page.getByTestId(`kitchen-ticket-${order.number}`)).toHaveText(`#${order.number} Pending`);
});
