import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, signIn, test, type Page } from '../staff-login';
import { archiveOpenVisit, cancelByApi, createOwnServer, moveByApi, openBoardLive, placeByApi, setSoldOut } from './helpers';

const UNIT = 'u3-kitchen-board';
const MOCKUPS = path.resolve('aidlc/spaces/default/intents/261105-table-order-app/inception/refined-mockups/html');
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

const LEFT_OUT = [
  'kitchen-board.html: the order numbers, which come from the running database',
  'states.html: every diner state (U1, U2) and the "Table Bill" states (U4)',
];

test.use({ viewport: { width: 1280, height: 800 } });

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

const clean = (text: string) => text.replace(/\s+/g, ' ').replace(/#\d+/g, '#N').trim();
const texts = async (page: Page, selector: string) => (await page.locator(selector).allInnerTexts()).map(clean);

async function expectSame(app: Page, mockup: Page, selectors: string[]) {
  for (const selector of selectors) expect(await texts(app, selector), selector).toEqual(await texts(mockup, selector));
}

async function stateText(states: Page, title: string) {
  const section = states.locator('section.state').filter({ has: states.getByRole('heading', { name: title, exact: true }) });
  return { section, text: clean(await section.locator('.notice').innerText()) };
}

/** Builds the mockup's orders, oldest first, so "newest first" gives its order. */
async function seedAsMockup(request: import('@playwright/test').APIRequestContext) {
  for (const table of [2, 3, 5, 7]) archiveOpenVisit(table);
  const item = (itemId: string, quantity = 1) => ({ itemId, quantity });
  const completed9 = await placeByApi(request, 5, [item('tomato-soup'), item('coffee', 2)]);
  await moveByApi(request, completed9.id, 'Pending', 'Preparing');
  await moveByApi(request, completed9.id, 'Preparing', 'Completed');
  const cancelled = await placeByApi(request, 5, [item('apple-pie')]);
  await cancelByApi(request, 5, cancelled.id);
  const preparing11 = await placeByApi(request, 7, [item('caesar-salad')]);
  await moveByApi(request, preparing11.id, 'Pending', 'Preparing');
  const preparing12 = await placeByApi(request, 5, [item('spaghetti-bolognese'), item('iced-tea')]);
  await moveByApi(request, preparing12.id, 'Pending', 'Preparing');
  const completed13 = await placeByApi(request, 3, [item('cheeseburger', 2)]);
  await moveByApi(request, completed13.id, 'Pending', 'Preparing');
  await moveByApi(request, completed13.id, 'Preparing', 'Completed');
  await placeByApi(request, 2, [item('margherita-pizza'), item('coffee')]);
  await placeByApi(request, 5, [item('cheeseburger'), item('lemonade', 2)]);
}

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.beforeEach(({}) => {
  for (let table = 1; table <= 10; table += 1) archiveOpenVisit(table);
});

test.afterEach(async ({ request }) => setSoldOut(request, 'ice-cream', false));

test('kitchen-board.html: tables, orders, "★ New", status words and moves', async ({ page, context, request }) => {
  await seedAsMockup(request);
  await openBoardLive(page);
  await expect(page.locator('.order')).toHaveCount(7);
  const mockup = await context.newPage();
  await mockup.goto(mockupUrl('kitchen-board.html'));
  await page.mouse.move(0, 0);

  await expectSame(page, mockup, ['.staff-bar h1', '.live', '.staff-bar .btn', '.table-card h2', '.table-card header .btn', '.table-card > p.muted', '.order-title', '.new-tag', '.status', '.order .muted', '.order .btn']);
  const highlighted = (target: Page) => target.locator('.order').evaluateAll((all) => all.map((one) => one.classList.contains('new')));
  expect(await highlighted(page)).toEqual(await highlighted(mockup));
  await savePair('kitchen-board', mockup, page);
});

test('the Menu availability panel matches #availability', async ({ page, context, request }) => {
  await setSoldOut(request, 'ice-cream', true);
  await openBoardLive(page);
  await page.getByTestId('availability-open').click();
  await expect(page.locator('.switch-row')).toHaveCount(12);
  const mockup = await context.newPage();
  await mockup.goto(`${mockupUrl('kitchen-board.html')}#availability`);

  await expectSame(page, mockup, ['.panel h2', '.panel .btn', '.panel p.muted', '.switch-row span', '.switch-row label']);
  const marks = (target: Page) => target.locator('.switch-row input').evaluateAll((all) => all.map((one) => (one as HTMLInputElement).checked));
  expect(await marks(page)).toEqual(await marks(mockup));
  await savePair('availability-panel', mockup, page);
});

test('states.html: connection lost', async ({ page, context, baseURL }) => {
  const states = await context.newPage();
  await states.goto(mockupUrl('states.html'));
  const { section, text } = await stateText(states, 'Kitchen Board: connection lost');
  const server = createOwnServer('mockup');
  try {
    await server.start();
    await signIn(page.context(), server.url);
    await openBoardLive(page, server.url);
    await server.stop();
    const built = page.getByTestId('board-reconnecting');
    await expect(built).toBeVisible();
    expect(clean(await built.innerText())).toBe(text);
    await page.screenshot({ path: path.join(OUTPUT, 'state-connection-lost-app.png') });
    await section.screenshot({ path: path.join(OUTPUT, 'state-connection-lost-mockup.png') });
  } finally {
    await server.remove();
    // Cookies ignore the port, so the own server's session replaced the main one.
    await signIn(page.context(), baseURL);
  }
});

test('states.html: change refused', async ({ page, context, request }) => {
  const states = await context.newPage();
  await states.goto(mockupUrl('states.html'));
  const { section, text } = await stateText(states, 'Kitchen Board: change refused');
  const order = await placeByApi(request, 2, [{ itemId: 'coffee', quantity: 1 }]);
  await openBoardLive(page);
  await page.route('**/status', async (route) => {
    await cancelByApi(request, 2, order.id);
    await route.continue();
  });
  await page.getByTestId(`board-move-${order.number}`).click();
  const built = page.getByTestId('board-message');
  await expect(built).toBeVisible();
  expect(clean(await built.innerText())).toBe(text);
  await page.screenshot({ path: path.join(OUTPUT, 'state-change-refused-app.png') });
  await section.screenshot({ path: path.join(OUTPUT, 'state-change-refused-mockup.png') });
});
