import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Locator, type Page } from '../staff-login';
import { add, archiveOpenVisit, CHEESE, chooseAllergens, customizeAndAdd, HOT, LARGE, moveByApi, openBoardLive, openMenuReady, PIZZA, placeByApi, placeOptions, waitSeen } from './helpers';

const UNIT = 'u6-diner-staff-features';
const TABLE = 4;
const WORDS = 'Large · Hot · Extra cheese';
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261109-table-order-v2/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

/** What the comparison leaves out. */
const LEFT_OUT = [
  'customize.html: "Spice level" and "No onions" are the mockup\'s invented names; the real seed says "Spice" and has no "No onions"',
  'customize.html: the mockup\'s $11.00 price; the seeded pizza is $12.00',
  'cart.html: the mockup\'s invented prices; the real seed is shown',
  'menu.html and table-bill.html: the mockups\' invented prices and dishes (House Salad is not on the menu)',
  'kitchen-board.html: the mockup\'s Mute sits in the heading; the app has it in the row below (through BoardExtras)',
  'my-orders.html: the order numbers and the minutes, which come from the running database',
  'my-orders.html: the mockup\'s Mute sits in the heading; the app has it in the row below (through OrderExtras)',
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

async function openMockup(page: Page, file: string, width = 390) {
  const mockup = await page.context().newPage();
  await mockup.setViewportSize({ width, height: 844 });
  await mockup.goto(mockupUrl(file));
  return mockup;
}

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(() => archiveOpenVisit(TABLE));

test('allergies.html: heading, note, the eight allergens and Done', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-allergies').click();
  await page.getByTestId('allergy-gluten').click();
  const mockup = await openMockup(page, 'allergies.html');
  const panel = page.getByTestId('allergy-panel');

  await expect(panel.locator('h1')).toHaveText(await mockup.locator('h1').innerText());
  await expect(panel.locator('p.muted')).toHaveText(await mockup.locator('p.muted').innerText());
  expect(await texts(panel.locator('.choice'))).toEqual(await texts(mockup.locator('.choice')));
  await expect(page.getByTestId('allergy-done')).toHaveText(await mockup.locator('button.btn').innerText());
  await savePair('allergies', mockup, page);
});

test('customize.html: dish, Make it yours, groups, choices and the add button', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId(`menu-customize-${PIZZA}`).click();
  const mockup = await openMockup(page, 'customize.html');
  const panel = page.getByTestId('customize-panel');

  await expect(panel.locator('h1')).toHaveText(await mockup.locator('h1').innerText());
  await expect(panel.locator('p.muted')).toHaveText(await mockup.locator('p.muted').innerText());
  await expect(panel.locator('h2').nth(0)).toHaveText(await mockup.locator('h2').nth(0).innerText());
  await expect(panel.locator('h2').nth(2)).toHaveText(await mockup.locator('h2').nth(2).innerText());
  await expect(panel.locator('.choice').filter({ hasText: 'Large' })).toContainText('+$3.00');
  await expect(mockup.locator('.choice').filter({ hasText: 'Large' })).toContainText('+$3.00');
  await expect(panel.locator('.choice').filter({ hasText: 'Extra cheese' })).toContainText('+$1.50');
  await expect(mockup.locator('.choice').filter({ hasText: 'Extra cheese' })).toContainText('+$1.50');
  await expect(panel.locator('.choice').filter({ hasText: 'Regular' })).toContainText('Selected');
  await expect(mockup.locator('.choice').filter({ hasText: 'Regular' })).toContainText('Selected');
  await expect(page.getByTestId('customize-add')).toHaveText(/^Add to cart · \$/);
  await expect(mockup.locator('button.btn')).toHaveText(/^Add to cart · \$/);
  await savePair('customize', mockup, page);
});

test('menu.html: Allergies, the request buttons, Contains and Customize', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  const mockup = await openMockup(page, 'menu.html');

  await expect(page.getByTestId('menu-allergies')).toHaveText(await mockup.locator('.topbar .btn.ghost').innerText());
  const requestWords = await texts(mockup.locator('.row .btn.ghost').filter({ hasNotText: 'Allergies' }));
  expect(await texts(page.locator('.request-buttons .btn'))).toEqual(requestWords);
  await expect(page.getByTestId('menu-contains-margherita-pizza')).toHaveText('Contains gluten');
  await expect(page.getByTestId('menu-contains-garlic-bread')).toHaveText(await mockup.locator('.tag.warn').innerText());
  await expect(page.getByTestId('menu-customize-garlic-bread')).toHaveText(await mockup.locator('.link').first().innerText());
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await savePair('menu', mockup, page);
});

test('cart.html: the warning box and the options under a line', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  await customizeAndAdd(page, PIZZA, [LARGE, HOT, CHEESE]);
  await add(page, 'garlic-bread');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('allergy-warning')).toBeVisible();
  const mockup = await openMockup(page, 'cart.html');

  await expect(page.getByTestId('allergy-warning').locator('strong').filter({ hasText: 'Garlic Bread' })).toHaveText(await mockup.locator('.warnbox strong').innerText());
  await expect(page.getByTestId('allergy-warning').locator('.muted')).toHaveText(await mockup.locator('.warnbox .muted').innerText());
  await expect(page.locator('.option-words')).toHaveText(await mockup.locator('article .muted').first().innerText());
  await savePair('cart', mockup, page);
});

test('my-orders.html: the banner, Mute, the tracker and the options', async ({ page, request }) => {
  const completed = await placeByApi(request, TABLE, [{ itemId: 'garlic-bread', quantity: 1 }]);
  const preparing = await placeOptions(request, TABLE, [{ itemId: PIZZA, quantity: 1, optionIds: [LARGE, HOT, CHEESE] }]);
  await moveByApi(request, preparing.id, 'Pending', 'Preparing');
  await moveByApi(request, completed.id, 'Pending', 'Preparing');
  await page.goto(`/table/${TABLE}/orders`);
  await waitSeen(page, TABLE, completed.id, 'Preparing');
  await moveByApi(request, completed.id, 'Preparing', 'Completed');
  await expect(page.getByTestId('ready-banner')).toBeVisible();
  const mockup = await openMockup(page, 'my-orders.html');

  await expect(page.getByTestId('ready-banner').locator('span')).toHaveText(/^Order #\d+ is ready$/);
  await expect(mockup.locator('.banner span')).toHaveText(/^Order #\d+ is ready$/);
  await expect(page.getByTestId('ready-banner-dismiss')).toHaveText(await mockup.locator('.banner button').innerText());
  await expect(page.getByTestId('mute-switch')).toHaveText(await mockup.locator('main > .row .btn.ghost').innerText());
  await expect(page.getByTestId(`order-tracker-${preparing.number}`).locator('.seg.on')).toHaveCount(await mockup.locator('.track').nth(0).locator('.seg.on').count());
  await expect(page.getByTestId(`order-tracker-${completed.number}`).locator('.seg.on')).toHaveCount(await mockup.locator('.track').nth(1).locator('.seg.on').count());
  await expect(page.getByTestId(`order-estimate-${preparing.number}`)).toHaveText(/^About \d+ min$/);
  await expect(mockup.locator('.card .price').first()).toHaveText(/^About \d+ min$/);
  await expect(page.locator('.option-words')).toHaveText(WORDS);
  await expect(mockup.locator('.card .muted').first()).toContainText(WORDS);
  await savePair('my-orders', mockup, page);
});

test.describe('staff screens', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('kitchen-board.html: the alert, Mute, the requests and the options', async ({ page, request, context }) => {
    await openBoardLive(page);
    const diner = await context.newPage();
    await openMenuReady(diner, TABLE);
    await diner.getByTestId('request-waiter').click();
    await diner.getByTestId('request-bill').click();
    await diner.close();
    const order = await placeOptions(request, TABLE, [{ itemId: PIZZA, quantity: 1, optionIds: [LARGE, HOT, CHEESE] }]);
    await expect(page.getByTestId(`kitchen-alert-${order.number}`)).toBeVisible();
    const mockup = await openMockup(page, 'kitchen-board.html', 1280);

    await expect(page.getByTestId(`kitchen-alert-${order.number}`).locator('span')).toHaveText(new RegExp(`^New order #${order.number} at Table ${TABLE}$`));
    await expect(mockup.locator('.banner span')).toHaveText(/^New order #\d+ at Table 4$/);
    await expect(page.getByTestId(`kitchen-alert-dismiss-${order.number}`)).toHaveText(await mockup.locator('.banner button').innerText());
    await expect(page.getByTestId('mute-switch')).toHaveText((await mockup.locator('main > .row .btn.ghost').innerText()));
    await expect(page.getByTestId(`board-table-${TABLE}`)).toHaveClass(/pulse/);
    await expect(mockup.locator('.staffcard.pulse')).toBeVisible();
    await expect(page.getByTestId(`board-requests-${TABLE}`).locator('span')).toHaveText(['Waiter called', 'Bill requested']);
    await expect(mockup.locator('.staffcard.pulse p').nth(0)).toContainText('Waiter called');
    await expect(mockup.locator('.staffcard.pulse p').nth(1)).toContainText('Bill requested');
    await expect(page.getByTestId(`board-respond-${TABLE}-waiter`)).toHaveText(await mockup.locator('.staffcard.pulse button').first().innerText());
    await expect(page.getByTestId(`board-table-${TABLE}`).locator('.option-words')).toHaveText(WORDS);
    await expect(mockup.locator('.board')).toContainText(WORDS);
    await savePair('kitchen-board', mockup, page);
  });

  test('table-bill.html: the options line', async ({ page, request }) => {
    await placeOptions(request, TABLE, [{ itemId: PIZZA, quantity: 1, optionIds: [LARGE, HOT, CHEESE] }]);
    await page.goto(`/staff/tables/${TABLE}`);
    await expect(page.locator('.bill .option-words')).toBeVisible();
    const mockup = await openMockup(page, 'table-bill.html', 1280);

    await expect(page.locator('.bill .option-words')).toHaveText(await mockup.locator('small').innerText());
    await expect(page.locator('h1')).toHaveText(new RegExp(`^${(await mockup.locator('h1').innerText()).replace('4', String(TABLE))}$`));
    await savePair('table-bill', mockup, page);
  });
});
