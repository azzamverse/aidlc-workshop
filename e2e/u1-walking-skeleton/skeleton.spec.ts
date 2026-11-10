import { whenRequestSent } from '../timing';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, restartSignedIn, signIn, test, type Page } from '../staff-login';

const LIVE_LIMIT_MS = 2000;

async function placeCoffeeFrom(page: Page) {
  await page.getByTestId('menu-add-coffee').click();
  await page.getByTestId('tab-cart').click();
  await page.getByTestId('cart-place-order').click();
}

test('an order from /table/5 shows on /staff within 2 seconds, with no refresh', async ({ browser, baseURL }) => {
  const staffContext = await browser.newContext({ baseURL });
  await signIn(staffContext, baseURL);
  const staff = await staffContext.newPage();
  const diner = await (await browser.newContext({ baseURL })).newPage();
  await staff.goto('/staff');
  await expect(staff.getByTestId('staff-live')).toHaveText(/Live/);
  await expect(staff.getByTestId('board-table-5')).toBeVisible();
  const ordersBefore = await staff.getByTestId('board-table-5').locator('.order').count();
  await diner.goto('/table/5');
  await diner.getByTestId('menu-add-cheeseburger').click();
  await diner.getByTestId('tab-cart').click();

  const sent = whenRequestSent(diner, 'POST', '/orders');
  await diner.getByTestId('cart-place-order').click();
  await expect(staff.getByTestId('board-table-5').locator('.order')).toHaveCount(ordersBefore + 1, {
    timeout: LIVE_LIMIT_MS,
  });
  const arrived = Date.now();
  expect(arrived - (await sent)).toBeLessThanOrEqual(LIVE_LIMIT_MS);

  await expect(diner.getByTestId('order-placed')).toContainText(/Order #\d+ placed/);
  await expect(staff.getByTestId('board-table-5').locator('.order').first()).toContainText('1 × Cheeseburger');
  await expect(staff.getByTestId('board-table-5').locator('.order').first()).toContainText('Pending');
});

test('a table address that does not exist says so and takes no orders', async ({ page }) => {
  for (const address of ['/table/99', '/table/abc', '/table/0']) {
    await page.goto(address);
    await expect(page.getByTestId('table-not-found')).toContainText('Table not found');
    await expect(page.getByTestId('tab-bar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add/ })).toHaveCount(0);
  }
});

test('every screen address serves the app and the tabs move between them', async ({ page }) => {
  await page.goto('/table/3');
  await expect(page.getByRole('heading', { name: 'Table 3', exact: true })).toBeVisible();
  await page.getByTestId('tab-cart').click();
  await expect(page).toHaveURL(/\/table\/3\/cart$/);
  await expect(page.getByRole('heading', { name: 'Your cart', exact: true })).toBeVisible();
  await page.getByTestId('tab-my-orders').click();
  await expect(page).toHaveURL(/\/table\/3\/orders$/);
  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
  await page.goto('/table/3/orders');
  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
  await page.goto('/staff/tables/3');
  await expect(page.getByRole('heading', { name: 'Table 3 bill' })).toBeVisible();
  await page.getByTestId('bill-back-to-board').click();
  await expect(page.getByRole('heading', { name: 'Kitchen Board' })).toBeVisible();
});

test('the board shows all 10 tables, each marked when empty', async ({ page }) => {
  await page.goto('/staff');
  await expect(page.getByTestId('board').locator('.table-card')).toHaveCount(10);
  await expect(page.getByTestId('board-table-10')).toContainText('No orders');
});

test.describe('a server of its own', () => {
  const ownPort = Number(process.env.E2E_PORT ?? 3100) + 100;
  const ownUrl = `http://localhost:${ownPort}`;
  let folder: string;
  let server: ChildProcess | undefined;

  async function startServer() {
    server = spawn(process.execPath, ['server/index.js'], {
      env: { ...process.env, PORT: String(ownPort), DB_FILE: path.join(folder, 'restart.db'), NODE_ENV: 'test' },
      stdio: 'ignore',
    });
    await expect
      .poll(() => fetch(`${ownUrl}/api/menu`).then((response) => response.ok, () => false), { timeout: 15_000 })
      .toBe(true);
  }

  async function stopServer() {
    const stopping = server;
    server = undefined;
    if (!stopping || stopping.exitCode !== null) return;
    await new Promise((resolve) => {
      stopping.once('exit', resolve);
      stopping.kill('SIGKILL');
    });
  }

  test.beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'table-order-e2e-'));
  });

  test.afterEach(async () => {
    await stopServer();
    fs.rmSync(folder, { recursive: true, force: true });
  });

  test('a restart keeps accepted orders and does not seed twice', async ({ page }) => {
    await startServer();
    await page.goto(`${ownUrl}/table/5`);
    await placeCoffeeFrom(page);
    await expect(page.getByTestId('order-placed')).toContainText('Order #1 placed');

    await stopServer();
    await startServer();
    await signIn(page.context(), ownUrl);

    await page.goto(`${ownUrl}/staff`);
    await expect(page.getByTestId('board-order-1')).toContainText('1 × Coffee');
    const menu = await (await fetch(`${ownUrl}/api/menu`)).json();
    expect(menu.categories.flatMap((category: { items: unknown[] }) => category.items)).toHaveLength(12);
  });

  test('the board reconnects by itself and shows what it missed', async ({ page }) => {
    await startServer();
    const { visitId } = await (await fetch(`${ownUrl}/api/tables/2`)).json();
    await signIn(page.context(), ownUrl);
    await page.goto(`${ownUrl}/staff`);
    await expect(page.getByTestId('staff-live')).toHaveText(/Live/);

    await stopServer();
    await expect(page.getByTestId('staff-live')).toHaveText(/Reconnecting/);
    await restartSignedIn(page, startServer, ownUrl);
    const response = await fetch(`${ownUrl}/api/tables/2/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, placementKey: 'missed', lines: [{ itemId: 'lemonade', quantity: 2 }] }),
    });
    expect(response.status).toBe(201);

    await expect(page.getByTestId('board-order-1')).toContainText('2 × Lemonade', { timeout: 15_000 });
    await expect(page.getByTestId('staff-live')).toHaveText(/Live/);
  });
});
