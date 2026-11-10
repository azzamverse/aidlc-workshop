import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn } from '../staff-login';
import { archiveOpenVisit, moveByApi, openMenuReady, placeByApi } from '../u2-diner-screens/helpers';
import { openView } from './helpers';

const UNIT = 'u7-3d-xfactors';
const TABLE = 2;
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261109-table-order-v2/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

const LEFT_OUT = [
  'all four mockups: the 3D drawing itself, which the mockups only sketch in CSS; the app draws it with three.js',
  'living-table.html: the dishes and their order, which come from the running database',
  'kitchen-theatre.html: the ticket numbers, which come from the running database; the app adds a station list under the rail',
  'bottle.html: the seat number, chosen at random by the server',
  'dice.html: the suggested dish and price (House Salad is not on the menu); the real seed is shown',
];

test.use({ viewport: { width: 390, height: 844 } });

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
const texts = async (locator: Locator) => (await locator.allInnerTexts()).map(clean);

async function savePair(name: string, mockup: Page, app: Page) {
  const mockupShot = await mockup.screenshot({ path: path.join(OUTPUT, `${name}-mockup.png`), fullPage: true });
  const appShot = await app.screenshot({ path: path.join(OUTPUT, `${name}-app.png`), fullPage: true });
  const sheet = await app.context().newPage();
  const image = (shot: Buffer, label: string) =>
    `<figure style="margin:0"><figcaption style="font:600 16px sans-serif;padding:8px">${label}</figcaption>` +
    `<img style="display:block;max-width:100%;border:1px solid #999" src="data:image/png;base64,${shot.toString('base64')}"></figure>`;
  await sheet.setViewportSize({ width: 900, height: 900 });
  await sheet.setContent(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;align-items:start">${image(mockupShot, 'Mockup')}${image(appShot, 'App')}</div>`);
  await sheet.screenshot({ path: path.join(OUTPUT, `${name}-side-by-side.png`), fullPage: true });
  await sheet.close();
}

async function openMockup(page: Page, file: string) {
  const mockup = await page.context().newPage();
  await mockup.setViewportSize({ width: 390, height: 844 });
  await mockup.goto(mockupUrl(file));
  return mockup;
}

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(() => archiveOpenVisit(TABLE));

test('living-table.html: heading, pills, hint and status words', async ({ page, context, request }) => {
  await signIn(context);
  const ready = await placeByApi(request, TABLE, [{ itemId: 'garlic-bread', quantity: 1 }]);
  await moveByApi(context.request, ready.id, 'Pending', 'Preparing');
  await moveByApi(context.request, ready.id, 'Preparing', 'Completed');
  const cooking = await placeByApi(request, TABLE, [{ itemId: 'spaghetti-bolognese', quantity: 1 }]);
  await moveByApi(context.request, cooking.id, 'Pending', 'Preparing');
  await placeByApi(request, TABLE, [{ itemId: 'margherita-pizza', quantity: 1 }]);
  await openView(page, TABLE, 'table');
  await expect(page.getByTestId('living-unit')).toHaveCount(3);
  const mockup = await openMockup(page, 'living-table.html');

  await expect(page.getByTestId('slot-living-table').locator('h2')).toHaveText(await mockup.locator('h1').innerText());
  expect(await texts(page.getByTestId('orders-switcher').locator('.pill'))).toEqual(await texts(mockup.locator('.pills .pill')));
  await expect(page.getByTestId('slot-living-table').locator('p.muted').last()).toHaveText(await mockup.locator('p.muted').innerText());
  const summary = await page.getByTestId('living-summary').innerText();
  for (const word of ['Ready', 'Cooking', 'Waiting']) {
    expect(summary).toContain(word);
    await expect(mockup.locator('.card')).toContainText(word);
  }
  await savePair('living-table', mockup, page);
});

test('kitchen-theatre.html: heading, stations, status words and note', async ({ page, context, request }) => {
  await signIn(context);
  const done = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await moveByApi(context.request, done.id, 'Pending', 'Preparing');
  await moveByApi(context.request, done.id, 'Preparing', 'Completed');
  const cooking = await placeByApi(request, TABLE, [{ itemId: 'lemonade', quantity: 1 }]);
  await moveByApi(context.request, cooking.id, 'Pending', 'Preparing');
  await placeByApi(request, TABLE, [{ itemId: 'garlic-bread', quantity: 1 }]);
  await openView(page, TABLE, 'kitchen');
  await expect(page.locator('.xf-ticket')).toHaveCount(3);
  const mockup = await openMockup(page, 'kitchen-theatre.html');

  await expect(page.getByTestId('slot-kitchen-theatre').locator('h2')).toHaveText(await mockup.locator('h1').innerText());
  expect(await texts(page.locator('.xf-station-name'))).toEqual(await texts(mockup.locator('.station')));
  const words = (values: string[]) => values.map((value) => value.replace(/#\d+ /, '')).sort();
  expect(words(await texts(page.locator('.xf-ticket')))).toEqual(words(await texts(mockup.locator('.ticket'))));
  await expect(page.getByTestId('slot-kitchen-theatre').locator('p.muted').last()).toHaveText(await mockup.locator('p.muted').innerText());
  await savePair('kitchen-theatre', mockup, page);
});

test('bottle.html: heading, questions, seats, button and result words', async ({ page, browser, baseURL }) => {
  const reduced = await browser.newContext({ baseURL, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  try {
    const app = await reduced.newPage();
    await openView(app, TABLE, 'bottle');
    await app.getByTestId('spin-start').click();
    await expect(app.getByTestId('spin-result')).toBeVisible();
    const mockup = await openMockup(page, 'bottle.html');

    await expect(app.getByTestId('slot-spin-the-bottle').locator('h2')).toHaveText(await mockup.locator('h1').innerText());
    expect(await texts(app.locator('[data-testid^="spin-question-"]'))).toEqual(await texts(mockup.locator('.row .pill')));
    await expect(app.getByTestId('spin-seats-value')).toHaveText('4');
    await expect(mockup.locator('.row.between')).toContainText('− 4 +');
    await expect(app.getByTestId('spin-start')).toHaveText(await mockup.locator('button.btn.block').innerText());
    const shape = (text: string) => text.replace(/\d/, 'N');
    expect(shape(await app.getByTestId('spin-result').innerText())).toBe(shape(await mockup.locator('.card strong').innerText()));
    await savePair('bottle', mockup, app);
  } finally {
    await reduced.close();
  }
});

test('dice.html: heading, moods, roll, reason words and buttons', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-chefs-dice').click();
  await page.getByTestId('dice-roll').click();
  await expect(page.getByTestId('dice-suggestion')).toBeVisible();
  const mockup = await openMockup(page, 'dice.html');
  const slot = page.getByTestId('slot-chefs-dice');

  await expect(slot.locator('h2')).toHaveText(await mockup.locator('h1').innerText());
  await expect(slot.locator('p.muted').first()).toHaveText(await mockup.locator('p.muted').first().innerText());
  expect(await texts(slot.locator('[data-testid^="dice-mood-"]'))).toEqual(await texts(mockup.locator('.pills .pill')));
  await expect(page.getByTestId('dice-roll')).toHaveText(await mockup.locator('button.btn.block').innerText());
  await expect(page.getByTestId('dice-suggestion').locator('p').first()).toHaveText(await mockup.locator('.item .muted').innerText());
  await expect(page.getByTestId('dice-add')).toHaveText(await mockup.locator('.row .btn').first().innerText());
  await expect(page.getByTestId('dice-again')).toHaveText(await mockup.locator('.row .btn.ghost').innerText());
  await savePair('dice', mockup, page);
});
