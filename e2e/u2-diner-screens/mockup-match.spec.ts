import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Locator, type Page } from '../staff-login';
import { add, archiveOpenVisit, cancelByApi, closeTable, createOwnServer, liveReady, moveByApi, openMenuReady, placeByApi, setSoldOut } from './helpers';

const UNIT = 'u2-diner-screens';
const TABLE = 5;
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261105-table-order-app/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

/** What this Unit does not build, so what the comparison leaves out. */
const LEFT_OUT = [
  'states.html: "Kitchen Board: connection lost" and "Kitchen Board: change refused" (U3)',
  'states.html: the four "Table Bill" states (U4)',
  'states.html: "Table not found" (U1, checked by its own mockup match)',
  'states.html: "Cart: item sold out while choosing": its note describes the mockup; the line is the normal cart line',
  'my-orders.html: the order numbers, which come from the running database',
];

test.use({ viewport: { width: 390, height: 844 } });

/** Saves the mockup and app screenshots, and one image with the two side by side. */
async function savePair(name: string, mockup: Page, app: Page, fullPage = true) {
  const mockupShot = await mockup.screenshot({ path: path.join(OUTPUT, `${name}-mockup.png`), fullPage });
  const appShot = await app.screenshot({ path: path.join(OUTPUT, `${name}-app.png`), fullPage });
  const sheet = await app.context().newPage();
  const image = (shot: Buffer, label: string) =>
    `<figure style="margin:0"><figcaption style="font:600 16px sans-serif;padding:8px">${label}</figcaption>` +
    `<img style="display:block;max-width:100%;border:1px solid #999" src="data:image/png;base64,${shot.toString('base64')}"></figure>`;
  await sheet.setViewportSize({ width: 900, height: 900 });
  await sheet.setContent(
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;align-items:start">${image(mockupShot, 'Mockup')}${image(appShot, 'App')}</div>`,
  );
  await sheet.screenshot({ path: path.join(OUTPUT, `${name}-side-by-side.png`), fullPage: true });
  await sheet.close();
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
const texts = async (locator: Locator) => (await locator.allInnerTexts()).map(clean);
const withoutNumbers = (values: string[]) => values.map((value) => value.replace(/#\d+/g, '#N'));

async function expectSameWords(app: Page, mockup: Page, selector: string, normalise = (values: string[]) => values) {
  expect(normalise(await texts(app.locator(selector))), selector).toEqual(normalise(await texts(mockup.locator(selector))));
}

const SHARED_SELECTORS = ['.topbar h1', '.topbar .muted', '.summary', 'nav.tabs a.tab'];

async function openMockup(page: Page, file: string) {
  const mockup = await page.context().newPage();
  await mockup.goto(mockupUrl(file));
  return mockup;
}

/** The app's words for one state compared with that state's section in states.html. */
async function expectState(app: Page, states: Page, title: string, selector: string, testId: string, name: string, normalise = (value: string) => value) {
  const section = states.locator('section.state').filter({ has: states.getByRole('heading', { name: title, exact: true }) });
  const built = app.getByTestId(testId);
  await expect(built).toBeVisible();
  expect(normalise(clean(await built.innerText()))).toEqual(normalise(clean(await section.locator(selector).first().innerText())));
  await app.screenshot({ path: path.join(OUTPUT, `state-${name}-app.png`) });
  await section.screenshot({ path: path.join(OUTPUT, `state-${name}-mockup.png`) });
}

const statesPage = (page: Page) => openMockup(page, 'states.html');

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(({}) => archiveOpenVisit(TABLE));

test.afterEach(async ({ request }) => setSoldOut(request, 'ice-cream', false));

async function fillCartAsMockup(page: Page) {
  await add(page, 'garlic-bread');
  await add(page, 'garlic-bread');
  await add(page, 'margherita-pizza');
}

test('menu.html: categories, pills, cards, Sold out and View cart', async ({ page, request }) => {
  await setSoldOut(request, 'ice-cream', true);
  await openMenuReady(page, TABLE);
  await fillCartAsMockup(page);
  const mockup = await openMockup(page, 'menu.html');

  // v2's chosen restyle heads the Menu with the table's name, so the two top-bar words are skipped.
  for (const selector of [...SHARED_SELECTORS.slice(2), '.pill', '.content h2', 'article.item h3', 'article.item p', '.price-row .price', '.add', '.soldout-tag', '.badge']) {
    await expectSameWords(page, mockup, selector);
  }
  await expect(page.locator('.pill.active')).toHaveText('Starters');
  expect(await page.locator('.add').evaluateAll((all) => all.map((one) => one.getAttribute('aria-label')))).toEqual(
    await mockup.locator('.add').evaluateAll((all) => all.map((one) => one.getAttribute('aria-label'))),
  );
  // The clicks scrolled the page; the full-page shot needs the sticky bar back at the top.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await savePair('menu', mockup, page);
});

test('cart.html: lines, stepper, Remove, total and Place order', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await fillCartAsMockup(page);
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('cart-place-order')).toBeVisible();
  const mockup = await openMockup(page, 'cart.html');

  for (const selector of [...SHARED_SELECTORS, 'article.card h3', 'article.card .price', 'article.card p.muted', '.stepper output', '.link-btn', '.total', '.badge']) {
    await expectSameWords(page, mockup, selector);
  }
  const labels = (target: Page) => target.locator('.stepper button').evaluateAll((all) => all.map((one) => [one.getAttribute('aria-label'), (one as HTMLButtonElement).disabled]));
  expect(await labels(page)).toEqual(await labels(mockup));
  await savePair('cart', mockup, page);
});

test('my-orders.html: placed message, cards, chips and the cancelled line', async ({ page, request }) => {
  const completed = await placeByApi(request, TABLE, [{ itemId: 'tomato-soup', quantity: 1 }, { itemId: 'coffee', quantity: 2 }]);
  await moveByApi(request, completed.id, 'Pending', 'Preparing');
  await moveByApi(request, completed.id, 'Preparing', 'Completed');
  const cancelled = await placeByApi(request, TABLE, [{ itemId: 'apple-pie', quantity: 1 }]);
  await cancelByApi(request, TABLE, cancelled.id);
  const preparing = await placeByApi(request, TABLE, [{ itemId: 'spaghetti-bolognese', quantity: 1 }, { itemId: 'iced-tea', quantity: 1 }]);
  await moveByApi(request, preparing.id, 'Pending', 'Preparing');

  await openMenuReady(page, TABLE);
  await add(page, 'cheeseburger');
  await add(page, 'lemonade');
  await add(page, 'lemonade');
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
  await expect(page.locator('article.card')).toHaveCount(4);
  const mockup = await openMockup(page, 'my-orders.html');

  for (const selector of [...SHARED_SELECTORS, '.notice', 'article.card h3', '.status', '.order-lines', 'article.card .line']) {
    await expectSameWords(page, mockup, selector, withoutNumbers);
  }
  await savePair('my-orders', mockup, page);
});

test('states.html: Menu loading and error', async ({ page }) => {
  const states = await statesPage(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/menu', async (route) => {
    await held;
    await route.abort();
  });
  await page.goto(`/table/${TABLE}`);
  await expect(page.getByTestId('menu-loading')).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT, 'state-menu-loading-app.png') });
  release();
  await expectState(page, states, 'Menu: error', '.notice', 'menu-error', 'menu-error');
  await expect(page.getByTestId('menu-error-retry')).toHaveText('Try again');
});

test('states.html: the empty views', async ({ page }) => {
  const states = await statesPage(page);
  await page.goto(`/table/${TABLE}/cart`);
  await expectState(page, states, 'Cart: empty', '.card.empty', 'cart-empty', 'cart-empty');
  await page.goto(`/table/${TABLE}/orders`);
  await expectState(page, states, 'My orders: empty', '.card.empty', 'orders-empty', 'orders-empty');
});

test('states.html: an item sold out, and placing failed', async ({ page, request }) => {
  const states = await statesPage(page);
  await openMenuReady(page, TABLE);
  await add(page, 'ice-cream');
  await page.getByTestId('tab-cart').click();
  await setSoldOut(request, 'ice-cream', true);
  await page.getByTestId('cart-place-order').click();
  await expectState(page, states, 'Cart: an item sold out', '.notice', 'cart-message', 'cart-sold-out');

  await page.route('**/api/tables/*/orders', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'x' } } }) : route.fallback(),
  );
  await page.getByRole('link', { name: 'Browse the menu' }).click();
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
  await expectState(page, states, 'Cart: placing failed', '.notice', 'cart-message', 'cart-placing-failed');
});

test('states.html: a quantity at the limit', async ({ page }) => {
  const states = await statesPage(page);
  await openMenuReady(page, TABLE);
  // In-page presses: this checks the words at the limit, and 20 driven clicks outlast WebKit's time here.
  await page.getByTestId('menu-add-coffee').evaluate((button: HTMLElement) => { for (let press = 0; press < 20; press += 1) button.click(); });
  await page.getByTestId('tab-cart').click();
  const section = states.locator('section.state').filter({ hasText: 'Cart: quantity at the limit' });
  await expect(page.getByTestId('cart-limit-coffee')).toHaveText((await section.locator('p.muted').innerText()));
  await expect(page.getByTestId('cart-quantity-coffee')).toHaveText((await section.locator('output').innerText()));
  await expect(page.getByTestId('cart-line-coffee').locator('.price')).toHaveText((await section.locator('.price').innerText()));
  await page.screenshot({ path: path.join(OUTPUT, 'state-cart-limit-app.png') });
  await section.screenshot({ path: path.join(OUTPUT, 'state-cart-limit-mockup.png') });
});

test('states.html: too late to cancel', async ({ page, request }) => {
  const states = await statesPage(page);
  const order = await placeByApi(request, TABLE, [{ itemId: 'coffee', quantity: 1 }]);
  await page.route('**/cancel', async (route) => {
    await moveByApi(request, order.id, 'Pending', 'Preparing');
    await route.continue();
  });
  await page.goto(`/table/${TABLE}/orders`);
  await page.getByTestId(`order-cancel-${order.number}`).click();
  await expectState(page, states, 'My orders: too late to cancel', '.notice', 'order-refused', 'orders-too-late', (value) => value.replace(/#\d+/, '#N'));
});

test('states.html: reconnecting', async ({ page }) => {
  const states = await statesPage(page);
  const server = createOwnServer('mockup');
  try {
    await server.start();
    await liveReady(page, async () => {
      await page.goto(`${server.url}/table/${TABLE}`);
      await expect(page.getByTestId('menu-pills')).toBeVisible();
    });
    await server.stop();
    await expectState(page, states, 'Any diner screen: reconnecting', '.notice', 'reconnecting', 'reconnecting');
  } finally {
    await server.remove();
  }
});

test('states.html: table closed', async ({ page, request }) => {
  const states = await statesPage(page);
  await liveReady(page, () => openMenuReady(page, TABLE));
  await closeTable(request, TABLE);
  await expectState(page, states, 'Any diner screen: table closed', '.card.empty', 'table-closed', 'table-closed');
});
