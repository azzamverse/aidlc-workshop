import { expect, test, type Page } from '@playwright/test';
import { archiveOpenVisit, openMenuReady } from '../u2-diner-screens/helpers';
import { disableWebGL, watchErrors } from './helpers';

const TABLE = 1;
const ALLERGIES_KEY = 'table-order.allergies';
const ALL_ALLERGENS = ['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'fish', 'shellfish'];

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(() => archiveOpenVisit(TABLE));

const openDice = async (page: Page) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-chefs-dice').click();
  await expect(page.getByTestId('dice-roll')).toBeVisible();
};

test('the Menu\'s first load fetches no 3D code', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => asked.push(new URL(request.url()).pathname));
  await openMenuReady(page, TABLE);
  await page.waitForLoadState('networkidle').catch(() => {}); // The live stream may keep the network busy.
  expect(asked.filter((path) => /three|ChefsDice|LivingTable|SceneHost/i.test(path))).toEqual([]);
});

test('a roll suggests a dish, adds it to the cart, and rolls again', async ({ page }) => {
  const errors = watchErrors(page);
  await disableWebGL(page);
  await openDice(page);
  await page.getByTestId('dice-mood-hearty').click();
  await page.getByTestId('dice-roll').click();
  await expect(page.getByTestId('dice-suggestion')).toContainText('The chef suggests this for a hearty mood.');
  await page.getByTestId('dice-add').click();
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');
  await page.getByTestId('dice-again').click();
  await expect(page.getByTestId('dice-suggestion')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Enter rolls, from the keyboard alone', async ({ page }) => {
  await disableWebGL(page);
  await openDice(page);
  await page.getByTestId('dice-mood-sweet').focus();
  await page.keyboard.press('Tab');
  await page.getByTestId('dice-roll').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('dice-suggestion')).toBeVisible();
});

test('with no qualifying dish it says so and suggests none', async ({ page }) => {
  await disableWebGL(page);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [ALLERGIES_KEY, JSON.stringify(ALL_ALLERGENS)],
  );
  await page.route('**/api/menu', async (route) => {
    const response = await route.fetch();
    const menu = await response.json();
    for (const category of menu.categories) for (const item of category.items) item.allergens = ['gluten'];
    await route.fulfill({ response, json: menu });
  });
  await openDice(page);
  await page.getByTestId('dice-roll').click();
  await expect(page.getByTestId('dice-none')).toContainText('No dish matches');
  await expect(page.getByTestId('dice-suggestion')).toHaveCount(0);
});

test('a denied motion request shows no error and the roll still works', async ({ page }) => {
  const errors = watchErrors(page);
  await disableWebGL(page);
  await page.addInitScript(() => {
    (globalThis as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent = class {
      static requestPermission() {
        return Promise.reject(new Error('denied'));
      }
    };
  });
  await openDice(page);
  await page.getByTestId('dice-roll').click();
  await expect(page.getByTestId('dice-suggestion')).toBeVisible();
  await expect(page.getByTestId('slot-error')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('under reduced motion the roll shows its result at once', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await openDice(page);
    await page.getByTestId('dice-roll').click();
    await expect(page.getByTestId('dice-suggestion')).toBeVisible({ timeout: 500 });
    await expect(page.getByTestId('dice-rolling')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
