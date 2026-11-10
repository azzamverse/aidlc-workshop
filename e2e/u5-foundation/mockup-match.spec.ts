import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetLockout, signIn, staffPin } from '../staff-login';
import { add, archiveOpenVisit, cancelByApi, moveByApi, openMenuReady, placeByApi } from '../u2-diner-screens/helpers';

const UNIT = 'u5-foundation';
const TABLE = 4;
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261109-table-order-v2/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

/** What later Units own, so what the comparison leaves out. */
const LEFT_OUT = [
  'menu.html: the Allergies button, "Call the waiter", "Ask for the bill", the allergy tags and Customize links (U6)',
  'cart.html: the allergy warning box and the chosen options under a line (U6)',
  'my-orders.html: the "is ready" banner, Mute, the tracker bar and "About N min" (U6)',
  'cart.html and menu.html: the prices and dishes the mockups invent; the real seed is shown (House Salad is not on the menu)',
  'my-orders.html: the order numbers, which come from the running database',
];

test.use({ viewport: { width: 390, height: 844 } });

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
const texts = async (locator: Locator) => (await locator.allInnerTexts()).map(clean);
const lettersOnly = (values: string[]) => values.map((value) => value.replace(/[^\p{L}\p{N}]/gu, '')); // WebKit reads "Cart1" where Chromium reads "Cart 1".

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

const expectTabs = async (app: Page, mockup: Page) =>
  expect(lettersOnly(await texts(app.locator('nav.tabs .tab')))).toEqual(lettersOnly(await texts(mockup.locator('nav.tabs .tab'))));

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(() => archiveOpenVisit(TABLE));

test('menu.html: heading, pills, Chef\'s Dice, Add, View cart and tabs', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'garlic-bread');
  const mockup = await openMockup(page, 'menu.html');

  await expect(page.locator('.topbar h1')).toHaveText(await mockup.locator('.topbar h1').innerText());
  expect(await texts(page.locator('.topbar .pill'))).toEqual(await texts(mockup.locator('.topbar .pill')));
  await expect(page.getByTestId('menu-chefs-dice')).toHaveText(clean(await mockup.locator('button.btn.block').first().innerText()));
  await expect(page.locator('h2').first()).toHaveText(await mockup.locator('h2').first().innerText());
  await expect(page.getByTestId('menu-item-garlic-bread').locator('h3')).toHaveText(await mockup.locator('.name').first().innerText());
  expect(clean(await page.getByTestId('menu-item-garlic-bread').locator('.price').innerText())).toBe(await mockup.locator('.price').first().innerText());
  await expect(page.getByTestId('menu-add-garlic-bread')).toHaveText(await mockup.locator('.add').first().innerText());
  expect(clean(await page.locator('.summary').innerText())).toBe(clean(await mockup.locator('.summary').innerText()));
  await expectTabs(page, mockup);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await savePair('menu', mockup, page);
});

test('cart.html: heading, line, Place order and tabs', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'margherita-pizza');
  await add(page, 'garlic-bread');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('cart-place-order')).toBeVisible();
  const mockup = await openMockup(page, 'cart.html');

  await expect(page.locator('h1')).toHaveText(await mockup.locator('h1').innerText());
  await expect(page.getByTestId('cart-line-garlic-bread').locator('h3')).toHaveText('Garlic Bread');
  await expect(mockup.locator('.name').nth(1)).toHaveText('Garlic Bread');
  const placeWords = /Place order/;
  await expect(page.getByTestId('cart-place-order')).toHaveText(placeWords);
  await expect(mockup.locator('.summary')).toHaveText(placeWords);
  await expect(page.getByTestId('cart-fewer-garlic-bread')).toHaveText('−');
  await expect(page.getByTestId('cart-more-garlic-bread')).toHaveText('+');
  expect(await page.getByTestId('cart-place-order').locator('.price').evaluate((price) => getComputedStyle(price, '::before').content)).toContain('·');
  await expectTabs(page, mockup);
  await savePair('cart', mockup, page);
});

test('my-orders.html: heading, pills, status words and tabs', async ({ page, context, request }) => {
  await signIn(context);
  const authorised = context.request;
  const completed = await placeByApi(request, TABLE, [{ itemId: 'garlic-bread', quantity: 1 }]);
  await moveByApi(authorised, completed.id, 'Pending', 'Preparing');
  await moveByApi(authorised, completed.id, 'Preparing', 'Completed');
  const cancelled = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await cancelByApi(request, TABLE, cancelled.id);
  const preparing = await placeByApi(request, TABLE, [{ itemId: 'margherita-pizza', quantity: 1 }]);
  await moveByApi(authorised, preparing.id, 'Pending', 'Preparing');

  await page.goto(`/table/${TABLE}/orders`);
  await expect(page.locator('article.card')).toHaveCount(3);
  const mockup = await openMockup(page, 'my-orders.html');

  await expect(page.locator('h1')).toHaveText(await mockup.locator('h1').innerText());
  expect(await texts(page.getByTestId('orders-switcher').locator('.pill'))).toEqual(await texts(mockup.locator('.pills .pill')));
  const statuses = async (target: Locator) => (await target.allInnerTexts()).map((text) => text.replace(/[^A-Za-z]/g, ''));
  expect((await statuses(page.locator('.status'))).sort()).toEqual((await statuses(mockup.locator('main strong'))).sort());
  await expect(page.locator('article.card h3').first()).toHaveText(/Order #\d+/);
  await expect(mockup.locator('h2').first()).toHaveText(/Order #\d+/);
  await expectTabs(page, mockup);
  await savePair('my-orders', mockup, page);
});

test('pin.html: words, keys, dots and the wrong-PIN message', async ({ page, request }) => {
  await resetLockout(request);
  await page.goto('/staff');
  await expect(page.getByTestId('pin-screen')).toBeVisible();
  const mockup = await openMockup(page, 'pin.html');
  await expect(page.locator('h1')).toHaveText(await mockup.locator('h1').innerText());
  await expect(page.locator('p.muted')).toHaveText(await mockup.locator('p.muted').innerText());
  expect(await texts(page.locator('.pin .key'))).toEqual(await texts(mockup.locator('.pin .key')));
  await expect(page.locator('.dots .dot')).toHaveCount(await mockup.locator('.dots .dot').count());

  const wrong = staffPin() === '1110' ? '1111' : '1110';
  for (const digit of wrong) await page.getByTestId(`pin-key-${digit}`).click();
  await expect(page.getByTestId('pin-message')).toHaveText(await mockup.locator('p').nth(1).innerText());
  for (const digit of '12') await page.getByTestId(`pin-key-${digit}`).click();
  await expect(page.locator('.dots .dot.on')).toHaveCount(await mockup.locator('.dots .dot.on').count());
  await savePair('pin', mockup, page);
});
