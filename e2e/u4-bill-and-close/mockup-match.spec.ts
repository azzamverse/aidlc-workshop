import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { coffee, completeByApi, moveByApi, placeByApi, resetTable } from './helpers';

const UNIT = 'u4-bill-and-close';
const TABLE = 5;
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261105-table-order-app/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

const LEFT_OUT = [
  'table-bill.html: the order numbers, which come from the running database',
  'states.html: every diner and Kitchen Board state (U1, U2, U3)',
];

test.use({ viewport: { width: 1280, height: 800 } });

const clean = (text: string) => text.replace(/\s+/g, ' ').replace(/#\d+/g, '#N').trim();
const texts = async (page: Page, selector: string) => (await page.locator(selector).allInnerTexts()).map(clean);

async function savePair(name: string, mockup: Page, app: Page) {
  const mockupShot = await mockup.screenshot({ path: path.join(OUTPUT, `${name}-mockup.png`), fullPage: true });
  const appShot = await app.screenshot({ path: path.join(OUTPUT, `${name}-app.png`), fullPage: true });
  const sheet = await app.context().newPage();
  const image = (shot: Buffer, label: string) =>
    `<figure style="margin:0"><figcaption style="font:600 16px sans-serif;padding:8px">${label}</figcaption>` +
    `<img style="display:block;max-width:100%;border:1px solid #999" src="data:image/png;base64,${shot.toString('base64')}"></figure>`;
  await sheet.setViewportSize({ width: 1400, height: 900 });
  await sheet.setContent(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;align-items:start">${image(mockupShot, 'Mockup')}${image(appShot, 'App')}</div>`);
  await sheet.screenshot({ path: path.join(OUTPUT, `${name}-side-by-side.png`), fullPage: true });
  await sheet.close();
}

async function stateSection(page: Page, title: string) {
  const states = await page.context().newPage();
  await states.goto(mockupUrl('states.html'));
  return states.locator('section.state').filter({ has: states.getByRole('heading', { name: title, exact: true }) });
}

async function saveState(name: string, app: Page, section: import('@playwright/test').Locator) {
  await app.screenshot({ path: path.join(OUTPUT, `state-${name}-app.png`) });
  await section.screenshot({ path: path.join(OUTPUT, `state-${name}-mockup.png`) });
}

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(async ({ request }) => resetTable(request, TABLE));

test('table-bill.html: orders, still open, total and the reason', async ({ page, context, request }) => {
  const first = await placeByApi(request, TABLE, [{ itemId: 'tomato-soup', quantity: 1 }, { itemId: 'coffee', quantity: 2 }]);
  await completeByApi(request, first.id);
  const second = await placeByApi(request, TABLE, [{ itemId: 'spaghetti-bolognese', quantity: 1 }, { itemId: 'iced-tea', quantity: 1 }]);
  await moveByApi(request, second.id, 'Pending', 'Preparing');
  await placeByApi(request, TABLE, [{ itemId: 'cheeseburger', quantity: 1 }, { itemId: 'lemonade', quantity: 2 }]);
  await page.goto(`/staff/tables/${TABLE}`);
  await expect(page.locator('section.card')).toHaveCount(3);
  const mockup = await context.newPage();
  await mockup.goto(mockupUrl('table-bill.html'));

  for (const selector of ['.staff-bar', '.notice', 'section.card h2', '.status', 'th', 'tbody td', 'tfoot td', '.total', '.bill-actions .muted', '.bill-actions .btn']) {
    expect(await texts(page, selector), selector).toEqual(await texts(mockup, selector));
  }
  await savePair('table-bill', mockup, page);
});

test('states.html: loading and error', async ({ page }) => {
  const section = await stateSection(page, 'Table Bill: error');
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/bill', async (route) => {
    await held;
    await route.abort();
  });
  await page.goto(`/staff/tables/${TABLE}`);
  await expect(page.getByTestId('bill-loading').locator('.skeleton')).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT, 'state-loading-app.png') });
  release();
  await expect(page.getByTestId('bill-error')).toBeVisible();
  expect(clean(await page.getByTestId('bill-error').innerText())).toBe(clean(await section.locator('.notice').innerText()));
  await expect(page.getByTestId('bill-error-retry')).toHaveText((await section.locator('.btn').innerText()));
  await saveState('error', page, section);
});

test('states.html: no orders', async ({ page }) => {
  const section = await stateSection(page, 'Table Bill: no orders');
  await page.goto(`/staff/tables/${TABLE}`);
  await expect(page.getByTestId('bill-empty')).toBeVisible();
  expect(clean(await page.getByTestId('bill-empty').innerText())).toBe(clean(await section.locator('.card.empty').innerText()));
  await saveState('no-orders', page, section);
});

test('states.html: ready to close, and closed', async ({ page, request }) => {
  const ready = await stateSection(page, 'Table Bill: ready to close');
  const closed = await stateSection(page, 'Table Bill: closed');
  const order = await placeByApi(request, TABLE, coffee);
  await completeByApi(request, order.id);
  await page.goto(`/staff/tables/${TABLE}`);
  await expect(page.getByTestId('bill-close')).toHaveText(await ready.locator('.btn').innerText());
  await expect(page.locator('.card.total span').first()).toHaveText(await ready.locator('.total span').first().innerText());
  await saveState('ready', page, ready);
  await page.getByTestId('bill-close').click();
  await expect(page.getByTestId('bill-closed')).toBeVisible();
  expect(clean(await page.getByTestId('bill-closed').innerText())).toBe(clean(await closed.locator('.notice').innerText()));
  await saveState('closed', page, closed);
});
