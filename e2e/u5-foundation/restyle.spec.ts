import { expect, test as base } from '@playwright/test';
import { test as signedInTest } from '../staff-login';
import { add, archiveOpenVisit, openMenuReady } from '../u2-diner-screens/helpers';

const TABLE = 2;
const test = base;

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(() => archiveOpenVisit(TABLE));

test('Menu, Cart and My orders use the new look', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  for (const open of [
    () => page.getByTestId('tab-menu').click(),
    () => page.getByTestId('tab-cart').click(),
    () => page.getByTestId('tab-my-orders').click(),
  ]) {
    await open();
    const look = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(look).toContain('radial-gradient');
  }
});

test('cards have visible depth and a serif name', async ({ page }) => {
  await openMenuReady(page, TABLE);
  const card = page.getByTestId('menu-item-coffee');
  expect(await card.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await card.locator('h3').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Georgia');
});

test('the 3-tab bar stays at the bottom, and the pills stay at the top while scrolling', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  const bar = await page.getByTestId('tab-bar').boundingBox();
  expect(Math.round((bar?.y ?? 0) + (bar?.height ?? 0))).toBe(844);
  await expect(page.getByTestId('tab-bar').locator('a.tab')).toHaveCount(3);
  const pills = await page.getByTestId('menu-pills').boundingBox();
  expect(pills?.y).toBeLessThan(120);
});

test('every control has a real 44 px touch area', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, 'coffee');
  const heightsOf = async (selector: string) =>
    page.locator(selector).evaluateAll((all) => all.map((one) => (one as HTMLElement).getBoundingClientRect().height));
  for (const selector of ['.pill', '.tab', '.summary .btn', '[data-testid="menu-chefs-dice"]']) {
    for (const height of await heightsOf(selector)) expect(height, selector).toBeGreaterThanOrEqual(44);
  }
  const addArea = await page.getByTestId('menu-add-coffee').evaluate((button) => {
    const after = getComputedStyle(button, '::after');
    return button.getBoundingClientRect().height - parseFloat(after.top) - parseFloat(after.bottom);
  });
  expect(addArea).toBeGreaterThanOrEqual(44);

  await page.getByTestId('tab-my-orders').click();
  for (const height of await heightsOf('[data-testid="orders-switcher"] .pill')) expect(height).toBeGreaterThanOrEqual(44);
});

test('the keyboard reaches and presses Chef\'s Dice', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-chefs-dice').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('slot-chefs-dice')).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('cards do not tilt and nothing transitions', async ({ page }) => {
    await openMenuReady(page, TABLE);
    const card = page.getByTestId('menu-item-coffee');
    const styles = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, duration: style.transitionDuration };
    });
    expect(styles).toEqual({ transform: 'none', duration: '0s' });
  });
});

signedInTest('the kitchen board and table bill keep v1\'s look', async ({ page }) => {
  for (const address of ['/staff', `/staff/tables/${TABLE}`]) {
    await page.goto(address);
    await expect(page.getByTestId('staff-bar')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(251, 247, 242)');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
  }
});
