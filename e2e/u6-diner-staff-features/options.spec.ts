import { expect, test } from '../staff-login';
import { add, archiveOpenVisit, CHEESE, customizeAndAdd, HOT, LARGE, openBoardLive, openMenuReady, PIZZA, setSoldOut } from './helpers';

const TABLE = 8;
const WORDS = 'Large · Hot · Extra cheese';
const testKey = (...ids: string[]) => [PIZZA, ...ids].sort((a, b) => (a === PIZZA ? -1 : b === PIZZA ? 1 : a.localeCompare(b))).join('|');

test.beforeEach(() => archiveOpenVisit(TABLE));

test('+ Add adds the defaults at once and opens nothing', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await add(page, PIZZA);
  await expect(page.getByTestId('customize-panel')).toHaveCount(0);
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId(`cart-line-${PIZZA}`)).toContainText('$12.00');
});

test('Customize shows the choices and the running price, and pick-one keeps one', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId(`menu-customize-${PIZZA}`).click();
  const addButton = page.getByTestId('customize-add');
  await expect(addButton).toHaveText('Add to cart · $12.00');
  await page.getByTestId(`customize-option-${LARGE}`).check();
  await expect(addButton).toHaveText('Add to cart · $15.00');
  await page.getByTestId(`customize-option-${CHEESE}`).check();
  await expect(addButton).toHaveText('Add to cart · $16.50');
  await expect(page.getByTestId(`customize-option-${PIZZA}-size-regular`)).not.toBeChecked();
  await page.getByTestId(`customize-option-${CHEESE}`).uncheck();
  await expect(addButton).toHaveText('Add to cart · $15.00');
});

test('extra cheese is offered only on dishes marked dairy', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-customize-coffee').click();
  await expect(page.getByTestId('customize-panel')).not.toContainText('Extra cheese');
});

test('a dish with no choices has no Customize link', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.getByTestId('menu-customize-chocolate-cake')).toHaveCount(0);
  await expect(page.getByTestId('menu-add-chocolate-cake')).toBeVisible();
});

test('the options show in words, with the price, on the Cart, My orders, the ticket and the bill', async ({ page, context }) => {
  await openMenuReady(page, TABLE);
  await customizeAndAdd(page, PIZZA, [LARGE, HOT, CHEESE]);
  await page.getByTestId('tab-cart').click();
  const key = testKey(CHEESE, HOT, LARGE);
  await expect(page.getByTestId(`cart-line-${key}`)).toContainText(WORDS);
  await expect(page.getByTestId(`cart-line-${key}`)).toContainText('$16.50');
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
  await expect(page.locator('article.card').first()).toContainText(WORDS);
  await expect(page.locator('article.card').first()).toContainText('$16.50');

  const staff = await context.newPage();
  await openBoardLive(staff);
  await expect(staff.getByTestId(`board-table-${TABLE}`)).toContainText(WORDS);
  await staff.goto(`/staff/tables/${TABLE}`);
  await expect(staff.locator('.bill table').first()).toContainText(WORDS);
  await expect(staff.getByTestId('bill-total')).toHaveText('$16.50');
});

test('the same choices share a line and different ones make two', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await customizeAndAdd(page, PIZZA, [LARGE]);
  await customizeAndAdd(page, PIZZA, [LARGE]);
  await add(page, PIZZA);
  await page.getByTestId('tab-cart').click();
  await expect(page.locator('article.card.item')).toHaveCount(2);
  await expect(page.getByTestId(`cart-quantity-${PIZZA}`)).toHaveText('1');
  await expect(page.locator('[data-testid^="cart-quantity-"]').first()).toHaveText('2');
});

test.describe('sold out', () => {
  test.afterEach(({ request }) => setSoldOut(request, PIZZA, false));

  test('a dish sold out with two sets of choices leaves the cart whole, named once', async ({ page, request }) => {
    await openMenuReady(page, TABLE);
    await customizeAndAdd(page, PIZZA, [LARGE]);
    await add(page, PIZZA);
    await add(page, 'coffee');
    await page.getByTestId('tab-cart').click();
    await setSoldOut(request, PIZZA, true);
    await page.getByTestId('cart-place-order').click();
    await expect(page.getByTestId('cart-message')).toHaveText(/Margherita Pizza just sold out, so we took it out of your cart/);
    await expect(page.locator('article.card.item')).toHaveCount(1);
    await expect(page.getByTestId('cart-line-coffee')).toBeVisible();
  });
});

test('the panel works by keyboard and closes on Escape', async ({ page }) => {
  await openMenuReady(page, TABLE);
  const opener = page.getByTestId(`menu-customize-${PIZZA}`);
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('customize-panel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('customize-panel')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
