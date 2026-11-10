import { expect, test } from '../staff-login';
import { add, archiveOpenVisit, chooseAllergens, openMenuReady } from './helpers';

const TABLE = 7;
const ordersOf = async (request) => (await (await request.get(`/api/tables/${TABLE}/orders`)).json()).orders;

test.beforeEach(() => archiveOpenVisit(TABLE));

test('offers all eight allergens with the note, and keeps them after a reload', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await page.getByTestId('menu-allergies').click();
  const panel = page.getByTestId('allergy-panel');
  await expect(panel).toContainText('For severe allergies, please check with staff.');
  await expect(panel.locator('.choice')).toHaveCount(8);
  await page.getByTestId('allergy-peanuts').click();
  await expect(page.getByTestId('allergy-peanuts')).toContainText('On');
  await page.getByTestId('allergy-done').click();
  await page.reload();
  await expect(page.getByTestId('menu-contains-chocolate-cake')).toHaveText('Contains peanuts');
});

test('no choices means no marks', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await expect(page.locator('.tag.warn')).toHaveCount(0);
});

test('a marked dish says so in words and can still be added', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  await expect(page.getByTestId('menu-contains-garlic-bread')).toHaveText('Contains gluten');
  await expect(page.getByTestId('menu-contains-coffee')).toHaveCount(0);
  await add(page, 'garlic-bread');
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');
});

test('the Cart names the unsafe dish; Cancel places nothing and keeps the cart', async ({ page, request }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  await add(page, 'garlic-bread');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('allergy-warning')).toContainText('Garlic Bread contains gluten.');
  await expect(page.getByTestId('allergy-warning')).toContainText('For severe allergies, please check with staff.');
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('confirm-unsafe')).toBeVisible();
  await page.getByTestId('confirm-unsafe-cancel').click();
  await expect(page.getByTestId('confirm-unsafe')).toHaveCount(0);
  await expect(page.getByTestId('cart-line-garlic-bread')).toBeVisible();
  expect(await ordersOf(request)).toEqual([]);
});

test('confirming places the order', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  await add(page, 'garlic-bread');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('allergy-warning')).toBeVisible();
  await page.getByTestId('cart-place-order').click();
  await page.getByTestId('confirm-unsafe-place').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
});

test('a safe cart places straight away', async ({ page }) => {
  await openMenuReady(page, TABLE);
  await chooseAllergens(page, ['gluten']);
  await add(page, 'coffee');
  await page.getByTestId('tab-cart').click();
  await expect(page.getByTestId('allergy-warning')).toHaveCount(0);
  await page.getByTestId('cart-place-order').click();
  await expect(page.getByTestId('order-placed')).toBeVisible();
});

test('the dialog takes focus, closes on Escape and gives focus back', async ({ page }) => {
  await openMenuReady(page, TABLE);
  const opener = page.getByTestId('menu-allergies');
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('allergy-panel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('allergy-panel')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
