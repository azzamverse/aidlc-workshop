import { expect, test } from '@playwright/test';
import { signIn } from '../staff-login';
import { archiveOpenVisit, cancelByApi, LIVE_LIMIT_MS, moveByApi, placeByApi } from '../u2-diner-screens/helpers';
import { disableWebGL, openView, watchErrors } from './helpers';

const TABLE = 5;

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(() => archiveOpenVisit(TABLE));

test('the view opens with no error and lists every unit in words', async ({ page, request }) => {
  const errors = watchErrors(page);
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 2 }, { itemId: 'garlic-bread', quantity: 1 }]);
  await openView(page, TABLE, 'table');
  await expect(page.getByTestId('living-unit')).toHaveCount(3);
  await expect(page.getByTestId('living-summary')).toContainText('Waiting');
  await expect(page.getByTestId('slot-error')).toHaveCount(0);
  await expect(page.locator('[data-testid="living-stage"] canvas, [data-testid="scene-fallback"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('a status change reaches the words with no refresh, and a cancelled order leaves', async ({ page, context, request }) => {
  await signIn(context);
  const cooked = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  const cancelled = await placeByApi(request, TABLE, [{ itemId: 'lemonade', quantity: 1 }]);
  await openView(page, TABLE, 'table');
  await expect(page.getByTestId('living-unit')).toHaveCount(2);
  await moveByApi(context.request, cooked.id, 'Pending', 'Preparing');
  await expect(page.getByTestId('living-summary')).toContainText('Cooking', { timeout: LIVE_LIMIT_MS });
  await cancelByApi(request, TABLE, cancelled.id);
  await expect(page.getByTestId('living-unit')).toHaveCount(1, { timeout: LIVE_LIMIT_MS });
});

test('more than 12 units shows "+N more" and still lists them all', async ({ page, request }) => {
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 15 }]);
  await openView(page, TABLE, 'table');
  await expect(page.getByTestId('living-more')).toHaveText('+3 more');
  await expect(page.getByTestId('living-unit')).toHaveCount(15);
});

test('the arrow keys and a drag turn the table where 3D runs', async ({ page, request }) => {
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await openView(page, TABLE, 'table');
  const stage = page.getByTestId('living-stage');
  await expect(page.locator('[data-testid="living-stage"], [data-testid="scene-fallback"]').first()).toBeVisible();
  test.skip((await stage.count()) === 0, 'This browser has no WebGL; rotation is covered by the unit tests.');

  await expect(page.getByRole('slider', { name: /Turn the table/ })).toBeVisible();
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage).toHaveAttribute('data-rotation', '0.262');
  await expect(stage).toHaveAttribute('aria-valuetext', 'Turned 15 degrees');
  await page.keyboard.press('ArrowLeft');
  await expect(stage).toHaveAttribute('data-rotation', '0.000');

  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 100);
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-rotation', '1.000');
});

test('with no 3D the text version shows, with no error', async ({ page, request }) => {
  await disableWebGL(page);
  const errors = watchErrors(page);
  await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await openView(page, TABLE, 'table');
  await expect(page.getByTestId('scene-fallback')).toBeVisible();
  await expect(page.getByTestId('living-stage')).toHaveCount(0);
  await expect(page.getByTestId('living-unit')).toHaveCount(1);
  expect(errors).toEqual([]);
});
