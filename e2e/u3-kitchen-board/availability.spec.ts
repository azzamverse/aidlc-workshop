import { whenRequestSent } from '../timing';
import { expect, test, type Page } from '../staff-login';
import { LIVE_LIMIT_MS, openBoardLive, setSoldOut } from './helpers';

const ITEM = 'tomato-soup';
const toggle = (page: Page, itemId = ITEM) => page.getByTestId(`availability-switch-${itemId}`);

async function openPanel(page: Page) {
  await openBoardLive(page);
  await page.getByTestId('availability-open').click();
  await expect(page.getByTestId('availability-panel').locator('.switch-row')).toHaveCount(12);
}

test.use({ viewport: { width: 1280, height: 800 } });

test.afterEach(async ({ request }) => setSoldOut(request, ITEM, false));

test('lists all 12 items with their saved marks', async ({ page, request }) => {
  await setSoldOut(request, ITEM, true);
  await openPanel(page);
  await expect(toggle(page)).toBeChecked();
  await expect(toggle(page, 'coffee')).not.toBeChecked();
});

test('a mark reaches an open menu within 2 seconds and stays after a refresh', async ({ page, browser, baseURL }) => {
  const diner = await (await browser.newContext({ baseURL })).newPage();
  const ready = diner.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/visit'));
  await diner.goto('/table/8');
  await ready;
  await openPanel(page);

  const sent = whenRequestSent(page, 'PUT', '/sold-out');
  await toggle(page).check();
  await expect(diner.getByTestId(`menu-sold-out-${ITEM}`)).toHaveText('Sold out', { timeout: LIVE_LIMIT_MS });
  const arrived = Date.now();
  expect(arrived - (await sent)).toBeLessThanOrEqual(LIVE_LIMIT_MS);

  await page.reload();
  await page.getByTestId('availability-open').click();
  await expect(toggle(page)).toBeChecked();
  await toggle(page).uncheck();
  await expect(diner.getByTestId(`menu-add-${ITEM}`)).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await diner.context().close();
});

test('a switch is disabled while saving', async ({ page }) => {
  await openPanel(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/sold-out', async (route) => {
    await held;
    await route.continue();
  });
  await toggle(page).click();
  await expect(toggle(page)).toBeDisabled();
  release();
  await expect(toggle(page)).toBeEnabled();
  await expect(toggle(page)).toBeChecked();
});

test('a failed save returns to the earlier mark and says so', async ({ page }) => {
  await openPanel(page);
  await page.route('**/sold-out', (route) => route.abort());
  await toggle(page).click();
  await expect(page.getByTestId('availability-message')).toContainText("We couldn't save that change. Please try again.");
  await expect(toggle(page)).not.toBeChecked();
  await expect(toggle(page)).toBeEnabled();
});

test('a failed read offers Try again inside the panel', async ({ page }) => {
  await openBoardLive(page);
  await page.route('**/api/menu', (route) => route.abort());
  await page.getByTestId('availability-open').click();
  await expect(page.getByTestId('availability-error')).toBeVisible();
  await page.unroute('**/api/menu');
  await page.getByTestId('availability-retry').click();
  await expect(page.locator('.switch-row')).toHaveCount(12);
  await expect(page.getByTestId('availability-error')).toHaveCount(0);
});

test('a live change from another screen updates a switch, and an older read does not undo it', async ({ page, request }) => {
  await openBoardLive(page);
  // Both first reads are answered from before the change and delivered after it.
  const stale: (() => void)[] = [];
  let reads = 0;
  await page.route('**/api/menu', async (route) => {
    const response = await route.fetch();
    reads += 1;
    await new Promise<void>((resolve) => stale.push(resolve));
    await route.fulfill({ response });
  });
  await page.getByTestId('availability-open').click();
  // The test server runs React's development build, whose StrictMode doubles first
  // effects, so the count of first reads varies. A read after the first means the stream started.
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(300);
  await setSoldOut(request, ITEM, true);
  // Let the panel receive the event before any stale answer is delivered.
  await page.waitForTimeout(500);
  stale.forEach((deliver) => deliver());
  await expect(toggle(page)).toBeChecked();
  await page.waitForTimeout(200);
  await expect(toggle(page)).toBeChecked();
});

test('regression: a switch keeps keyboard focus while it saves', async ({ page }) => {
  await openPanel(page);
  await toggle(page).focus();
  await page.keyboard.press('Space');
  await expect(toggle(page)).toBeChecked();
  await expect(toggle(page)).toBeEnabled();
  await expect(toggle(page)).toBeFocused();
});

test('focus moves into the panel; Escape and Close return it to the button; Space toggles', async ({ page }) => {
  await openBoardLive(page);
  const opener = page.getByTestId('availability-open');
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('availability-close')).toBeFocused();
  await expect(page.locator('.switch-row')).toHaveCount(12);
  await toggle(page).focus();
  await page.keyboard.press('Space');
  await expect(toggle(page)).toBeChecked();
  await expect(toggle(page)).toBeEnabled();
  await page.keyboard.press('Space');
  await expect(toggle(page)).not.toBeChecked();
  await expect(toggle(page)).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('availability-panel')).toHaveCount(0);
  await expect(opener).toBeFocused();

  await page.keyboard.press('Enter');
  await page.getByTestId('availability-close').click();
  await expect(page.getByTestId('availability-panel')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
