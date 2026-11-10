import { expect, test, type APIRequestContext, type Page, type Route } from '@playwright/test';
import { archiveOpenVisit, closeTable, LIVE_LIMIT_MS, visitOf } from '../u2-diner-screens/helpers';
import { disableWebGL, openView, watchErrors } from './helpers';

const TABLE = 10;
const RESULT = /Seat \d (picks up the tab|orders dessert)!/;

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(() => archiveOpenVisit(TABLE));

/** Opens the view and returns once its stream is open and its first read has been answered. */
async function openBottleLive(page: Page) {
  const firstRead = page.waitForResponse((response) => response.url().endsWith(`/api/tables/${TABLE}/spin`));
  await openView(page, TABLE, 'bottle');
  await firstRead;
}

const postSpin = (request: APIRequestContext) =>
  request.post(`/api/tables/${TABLE}/spin`, { data: { question: 'tab', seats: 4 } });

for (const [name, answer] of [
  ['regression: a spin.started never shows as live when the confirming read fails', (route: Route) => route.abort()],
  ['a replayed spin.started never shows as live when the server says no spin is running', (route: Route) => route.fulfill({ json: null })],
] as const) {
  test(name, async ({ page, request }) => {
    await disableWebGL(page); // The result would show at once, so a stale spin is easy to see.
    await openBottleLive(page);
    await page.route(`**/api/tables/${TABLE}/spin`, answer);
    const read = page.waitForRequest((sent) => sent.url().endsWith(`/api/tables/${TABLE}/spin`));
    expect((await postSpin(request)).status()).toBe(201);
    await read;
    await page.waitForTimeout(500);
    await expect(page.getByTestId('spin-result')).toHaveCount(0);
    await expect(page.getByTestId('spin-status')).toHaveCount(0);
    await expect(page.getByTestId('slot-spin-the-bottle')).toHaveAttribute('data-phase', 'idle');
  });
}

test('regression: a second spin never takes the previous result phase', async ({ page, request }) => {
  await openBottleLive(page);
  const stage = page.getByTestId('bottle-stage');
  test.skip((await stage.count()) === 0, 'This browser has no WebGL; a spin without 3D has no animation phase.');

  await page.evaluate(() => {
    const section = document.querySelector('[data-testid="slot-spin-the-bottle"]')!;
    const log: string[] = [];
    (window as unknown as { phaseLog: string[] }).phaseLog = log;
    new MutationObserver(() => log.push(`${section.getAttribute('data-spin-id')}:${section.getAttribute('data-phase')}`))
      .observe(section, { attributes: true });
  });
  await postSpin(request);
  await expect(page.getByTestId('spin-result')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(200);
  const second = await (await postSpin(request)).json();
  await expect(page.getByTestId('spin-status')).toBeVisible({ timeout: LIVE_LIMIT_MS });

  const log = await page.evaluate(() => (window as unknown as { phaseLog: string[] }).phaseLog);
  const firstSeen = log.find((entry) => entry.startsWith(second.id));
  expect(firstSeen).not.toBe(`${second.id}:result`);
});

test('a new visit after a closed table starts with no spin showing', async ({ page, request }) => {
  await disableWebGL(page);
  await openView(page, TABLE, 'bottle');
  await page.getByTestId('spin-start').click();
  await expect(page.getByTestId('spin-result')).toBeVisible();
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await page.getByTestId('tab-my-orders').click();
  await expect(page.getByTestId('table-closed')).toHaveCount(0);
  await page.getByTestId('orders-view-bottle').click();
  await expect(page.getByTestId('spin-start')).toBeVisible();
  await expect(page.getByTestId('spin-result')).toHaveCount(0);
});

test('two screens of the table show the same spin and result',async ({ browser, baseURL }) => {
  const first = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const second = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  try {
    await disableWebGL(first);
    await disableWebGL(second);
    const [one, two] = [await first.newPage(), await second.newPage()];
    await openView(one, TABLE, 'bottle');
    await openView(two, TABLE, 'bottle');
    await expect(two.getByTestId('spin-start')).toBeEnabled();
    await two.waitForTimeout(300); // Both live streams are open.
    await one.getByTestId('spin-start').click();
    await expect(one.getByTestId('spin-result')).toHaveText(RESULT);
    await expect(two.getByTestId('spin-result')).toHaveText(await one.getByTestId('spin-result').innerText(), { timeout: LIVE_LIMIT_MS });
  } finally {
    await first.close();
    await second.close();
  }
});

test('a second spin shows a plain refusal, and the current result stays', async ({ page }) => {
  await disableWebGL(page);
  await openView(page, TABLE, 'bottle');
  await page.getByTestId('spin-start').click();
  await expect(page.getByTestId('spin-result')).toHaveText(RESULT);
  const shown = await page.getByTestId('spin-result').innerText();
  await page.getByTestId('spin-start').click();
  await expect(page.getByTestId('spin-refusal')).toContainText('already spinning');
  await expect(page.getByTestId('spin-result')).toHaveText(shown);
});

test('a screen opened during a spin shows it', async ({ page, request }) => {
  await disableWebGL(page);
  await visitOf(request, TABLE);
  const started = await (await request.post(`/api/tables/${TABLE}/spin`, { data: { question: 'dessert', seats: 3 } })).json();
  await openView(page, TABLE, 'bottle');
  await expect(page.getByTestId('spin-result')).toHaveText(`Seat ${started.resultSeat} orders dessert!`);
});

test('where 3D runs the bottle spins for the time left, then shows the result', async ({ page, request }) => {
  const errors = watchErrors(page);
  await openView(page, TABLE, 'bottle');
  const stage = page.getByTestId('bottle-stage');
  await expect(page.locator('[data-testid="bottle-stage"], [data-testid="scene-fallback"]').first()).toBeVisible();
  test.skip((await stage.count()) === 0, 'This browser has no WebGL; the text version is covered above.');

  await page.waitForTimeout(300);
  await visitOf(request, TABLE);
  await request.post(`/api/tables/${TABLE}/spin`, { data: { question: 'tab', seats: 4 } });
  await expect(page.getByTestId('spin-status')).toBeVisible({ timeout: LIVE_LIMIT_MS });
  await expect(page.getByTestId('spin-start')).toBeDisabled();
  await expect(page.getByTestId('spin-result')).toHaveText(RESULT, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('under reduced motion the result shows at once', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await openView(page, TABLE, 'bottle');
    await page.getByTestId('spin-start').click();
    await expect(page.getByTestId('spin-result')).toHaveText(RESULT, { timeout: 1500 });
    await expect(page.getByTestId('spin-status')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('a table closed during a spin shows the closed view', async ({ page, request }) => {
  await disableWebGL(page);
  await openView(page, TABLE, 'bottle');
  await page.getByTestId('spin-start').click();
  await expect(page.getByTestId('spin-result')).toBeVisible();
  await closeTable(request, TABLE);
  await expect(page.getByTestId('table-closed')).toBeVisible({ timeout: LIVE_LIMIT_MS });
});
