import { expect, test, type Page } from '@playwright/test';
import { placeByApi } from '../u2-diner-screens/helpers';
import { resetLockout, signIn, staffPin } from '../staff-login';

const wrongPin = () => (staffPin() === '0000' ? '1111' : '0000');

async function enterPin(page: Page, pin: string) {
  for (const digit of pin) await page.getByTestId(`pin-key-${digit}`).click();
}

test.beforeEach(async ({ request }) => resetLockout(request));

for (const address of ['/staff', '/staff/tables/3']) {
  test(`${address} shows only the PIN screen with no session`, async ({ page }) => {
    await page.goto(address);
    await expect(page.getByTestId('pin-screen')).toBeVisible();
    await expect(page.getByTestId('staff-bar')).toHaveCount(0);
    await expect(page.getByTestId('tab-bar')).toHaveCount(0);
  });
}

test('the right PIN opens the page, and a reload stays open', async ({ page }) => {
  await page.goto('/staff');
  await enterPin(page, staffPin());
  await expect(page.getByTestId('board')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('board')).toBeVisible();
  await expect(page.getByTestId('pin-screen')).toHaveCount(0);
});

test('page scripts cannot read the session cookie', async ({ page }) => {
  await page.goto('/staff');
  await enterPin(page, staffPin());
  await expect(page.getByTestId('board')).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain('staff_session');
});

test('each digit fills a dot', async ({ page }) => {
  await page.goto('/staff');
  await enterPin(page, wrongPin().slice(0, 2));
  await expect(page.getByTestId('pin-dots').locator('.dot.on')).toHaveCount(2);
  await expect(page.getByTestId('pin-dots')).toHaveAttribute('aria-label', '2 of 4 digits entered');
});

test('a wrong PIN says so, clears the entry and opens nothing', async ({ page }) => {
  await page.goto('/staff');
  await enterPin(page, wrongPin());
  await expect(page.getByTestId('pin-message')).toHaveText("That PIN isn't right");
  await expect(page.getByTestId('pin-dots').locator('.dot.on')).toHaveCount(0);
  await expect(page.getByTestId('board')).toHaveCount(0);
});

test('the fifth wrong PIN locks, and the right PIN is then refused', async ({ page }) => {
  await page.goto('/staff');
  for (let tries = 0; tries < 5; tries += 1) {
    await enterPin(page, wrongPin());
    await expect(page.getByTestId('pin-dots').locator('.dot.on')).toHaveCount(0);
  }
  await expect(page.getByTestId('pin-message')).toContainText('try again in 30 seconds');
  await enterPin(page, staffPin());
  await expect(page.getByTestId('pin-message')).toContainText('try again in 30 seconds');
  await expect(page.getByTestId('board')).toHaveCount(0);
});

test('typing the digits works too', async ({ page }) => {
  await page.goto('/staff');
  await expect(page.getByTestId('pin-screen')).toBeVisible();
  // WebKit on Windows can leave a new page without keyboard focus until it is clicked.
  await page.getByRole('heading', { name: 'Staff only' }).click();
  await page.keyboard.type(staffPin());
  await expect(page.getByTestId('board')).toBeVisible();
});

test('a session that ends returns the open page to the PIN screen', async ({ page, context, request }) => {
  const order = await placeByApi(request, 6, [{ itemId: 'coffee', quantity: 1 }]);
  await signIn(context);
  await page.goto('/staff');
  const move = page.getByTestId(`board-move-${order.number}`);
  await expect(move).toBeVisible();
  await context.clearCookies();
  await move.click();
  await expect(page.getByTestId('pin-screen')).toBeVisible();
  await expect(page.getByTestId('staff-bar')).toHaveCount(0);
});

test('a refused all-tables stream returns the board to the PIN screen', async ({ page, context }) => {
  await signIn(context);
  // An answered refusal stops the browser's own retries, as a real 401 does.
  await page.route('**/api/events', (route) => route.fulfill({ status: 401, json: { error: { code: 'STAFF_REQUIRED', message: 'x' } } }));
  await page.goto('/staff');
  await expect(page.getByTestId('board')).toBeVisible();
  await context.clearCookies();
  await expect(page.getByTestId('pin-screen')).toBeVisible();
});
