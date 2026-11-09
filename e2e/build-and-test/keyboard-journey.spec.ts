import { expect, test, type Locator, type Page } from '@playwright/test';

const TABLE = 8;
const tabKey = (browserName: string) => browserName;

async function tabTo(page: Page, target: Locator, browserName: string) {
  const isLink = await target.evaluate((element) => element.tagName === 'A');
  // This WebKit build's Tab never lands on links, so there the link is focused directly
  // and only Enter is proved. Reaching links by Tab is proved in Chromium and Chrome.
  if (browserName === 'webkit' && isLink) {
    await target.focus();
    return;
  }
  const key = 'Tab';
  for (let presses = 0; presses < 80; presses += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The keyboard never reached the control.');
}

test('the whole journey works by keyboard alone, from ordering to closing the table', async ({ page, browserName }) => {
  const key = tabKey(browserName);

  await page.goto(`/table/${TABLE}`);
  await tabTo(page, page.getByTestId('menu-add-coffee'), key);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tab-cart-badge')).toHaveText('1');

  await tabTo(page, page.getByTestId('tab-cart'), key);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/cart$`));

  await tabTo(page, page.getByTestId('cart-place-order'), key);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/table/${TABLE}/orders$`));
  const title = await page.locator('article.card').first().innerText();
  const number = /Order #(\d+)/.exec(title)?.[1];
  expect(number).toBeTruthy();

  await page.goto('/staff');
  const move = page.getByTestId(`board-move-${number}`);
  await tabTo(page, move, key);
  await page.keyboard.press('Enter');
  await expect(move).toHaveText('Mark completed');
  await expect(move).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(move).toHaveCount(0);

  await page.goto('/staff');
  await tabTo(page, page.getByTestId(`board-open-bill-${TABLE}`), key);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/staff/tables/${TABLE}$`));

  await tabTo(page, page.getByTestId('bill-close'), key);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bill-closed')).toBeFocused();

  await tabTo(page, page.getByTestId('bill-back-to-board'), key);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByTestId(`board-table-${TABLE}`)).toContainText('No orders');
});
