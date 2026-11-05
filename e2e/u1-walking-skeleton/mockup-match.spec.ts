import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const UNIT = 'u1-walking-skeleton';
const MOCKUPS = path.resolve(
  'aidlc/spaces/default/intents/261105-table-order-app/inception/refined-mockups/html',
);
const OUTPUT = path.resolve('test-results/mockup-match', UNIT);
const mockupUrl = (file: string) => pathToFileURL(path.join(MOCKUPS, file)).href;

/** What this Unit does not build, so what the comparison leaves out. */
const LEFT_OUT = [
  'menu.html: the item cards, category pills and "View cart" summary (U2)',
  'cart.html and my-orders.html: the screen contents (U2)',
  'kitchen-board.html: the styled order cards, highlight, "Open bill", status buttons and "Menu availability" (U3)',
  'table-bill.html: the whole screen except its frame (U4)',
];

/** Saves the mockup and app screenshots, and one image with the two side by side. */
async function savePair(name: string, mockup: Page, app: Page) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const mockupShot = await mockup.screenshot({ path: path.join(OUTPUT, `${name}-mockup.png`) });
  const appShot = await app.screenshot({ path: path.join(OUTPUT, `${name}-app.png`) });
  const sheet = await app.context().newPage();
  const image = (shot: Buffer, label: string) =>
    `<figure style="margin:0"><figcaption style="font:600 16px sans-serif;padding:8px">${label}</figcaption>` +
    `<img style="display:block;max-width:100%;border:1px solid #999" src="data:image/png;base64,${shot.toString('base64')}"></figure>`;
  await sheet.setViewportSize({ width: 1400, height: 900 });
  await sheet.setContent(
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;align-items:start">${image(mockupShot, 'Mockup')}${image(appShot, 'App')}</div>`,
  );
  await sheet.screenshot({ path: path.join(OUTPUT, `${name}-side-by-side.png`), fullPage: true });
  await sheet.close();
}

const tabLabels = (page: Page) =>
  page.locator('nav.tabs a.tab').evaluateAll((tabs) =>
    tabs.map((tab) => [...tab.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent?.trim()).join('')),
  );

const barStyle = (page: Page) =>
  page.locator('nav.tabs').evaluate((bar) => {
    const style = getComputedStyle(bar);
    const box = bar.getBoundingClientRect();
    return {
      position: style.position,
      backgroundColor: style.backgroundColor,
      columns: style.gridTemplateColumns,
      restsOnBottom: Math.round(box.bottom) === window.innerHeight,
      height: box.height,
    };
  });

const currentTab = (page: Page) =>
  page.locator('nav.tabs a[aria-current="page"]').evaluate((tab) => {
    const style = getComputedStyle(tab);
    return { text: tab.textContent, color: style.color, background: style.backgroundColor, inset: style.boxShadow };
  });

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'left-out.txt'), `${LEFT_OUT.join('\n')}\n`);
});

test.describe('diner frame', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the bottom tab bar on the Menu matches menu.html, badge included', async ({ page, context }) => {
    const mockup = await context.newPage();
    await mockup.goto(mockupUrl('menu.html'));
    await page.goto('/table/5');
    await expect(page.getByTestId('tab-bar')).toBeVisible();
    await expect(page.getByTestId('tab-cart-badge')).toHaveCount(0);
    for (const item of ['garlic-bread', 'coffee', 'lemonade']) await page.getByTestId(`menu-add-${item}`).click();

    expect(await tabLabels(page)).toEqual(await tabLabels(mockup));
    expect(await barStyle(page)).toEqual(await barStyle(mockup));
    expect(await barStyle(page)).toMatchObject({ position: 'fixed', restsOnBottom: true });
    expect(await currentTab(page)).toEqual(await currentTab(mockup));
    await expect(page.getByTestId('tab-cart-badge')).toHaveText('3');
    await expect(mockup.locator('.badge')).toHaveText('3');
    await expect(page.getByTestId('tab-cart-badge')).toHaveAttribute('aria-label', '3 items');

    await savePair('menu-tab-bar', mockup, page);
  });

  for (const [tab, file, address] of [
    ['Cart', 'cart.html', '/table/5/cart'],
    ['My orders', 'my-orders.html', '/table/5/orders'],
  ]) {
    test(`the ${tab} tab is the current one, as in ${file}`, async ({ page, context }) => {
      const mockup = await context.newPage();
      await mockup.goto(mockupUrl(file));
      await page.goto(address);
      await expect(page.getByTestId('tab-bar')).toBeVisible();
      expect(await tabLabels(page)).toEqual(await tabLabels(mockup));
      const app = await currentTab(page);
      const designed = await currentTab(mockup);
      expect(app.text).toContain(tab);
      expect({ ...app, text: '' }).toEqual({ ...designed, text: '' });
      await savePair(`${tab.toLowerCase().replace(' ', '-')}-tab-bar`, mockup, page);
    });
  }

  test('"Table not found" shows the words from states.html', async ({ page, context }) => {
    const mockup = await context.newPage();
    await mockup.goto(mockupUrl('states.html'));
    const designed = mockup.locator('section.state', { hasText: 'Table not found' }).locator('.card.empty');
    await page.goto('/table/99');
    const built = page.getByTestId('table-not-found');
    await expect(built.getByRole('heading')).toHaveText((await designed.locator('h3').textContent()) ?? '');
    await expect(built.locator('p')).toHaveText((await designed.locator('p').textContent()) ?? '');
    await savePair('table-not-found', mockup, page);
  });
});

test.describe('staff frame', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  const frameFacts = (page: Page) =>
    page.locator('header.staff-bar').evaluate((bar) => {
      const style = getComputedStyle(bar);
      return {
        position: style.position,
        padding: style.padding,
        background: style.backgroundColor,
        title: bar.querySelector('h1')?.textContent,
        titleSize: getComputedStyle(bar.querySelector('h1') as Element).fontSize,
      };
    });

  test('the Kitchen Board frame and Live word match kitchen-board.html', async ({ page, context }) => {
    const mockup = await context.newPage();
    await mockup.goto(mockupUrl('kitchen-board.html'));
    await page.goto('/staff');
    await expect(page.getByTestId('staff-live')).toHaveText(/Live/);
    expect(await frameFacts(page)).toEqual(await frameFacts(mockup));
    await expect(mockup.locator('.live')).toHaveText(/Live/);
    await savePair('kitchen-board-frame', mockup, page);
  });

  test('the Table Bill frame matches table-bill.html', async ({ page, context }) => {
    const mockup = await context.newPage();
    await mockup.goto(mockupUrl('table-bill.html'));
    await page.goto('/staff/tables/5');
    await expect(page.getByTestId('staff-bar')).toBeVisible();
    expect(await frameFacts(page)).toEqual(await frameFacts(mockup));
    await expect(page.getByTestId('bill-back-to-board')).toHaveText(
      (await mockup.locator('header.staff-bar a').textContent()) ?? '',
    );
    await savePair('table-bill-frame', mockup, page);
  });
});
