import { expect, test, type Locator, type Page } from '../staff-login';
import { archiveOpenVisit, openBoardLive, openMenuReady } from '../u6-diner-staff-features/helpers';

// Read-only table for the width checks; the keyboard journey has its own table.
const WIDTH_TABLE = 3;
const KEYBOARD_TABLE = 5;

async function expectNoSidewaysScroll(page: Page) {
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }));
  expect(widths.content, `content is ${widths.content}px on a ${widths.screen}px screen`).toBeLessThanOrEqual(widths.screen);
}

async function tabTo(page: Page, target: Locator) {
  for (let presses = 0; presses < 120; presses += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The keyboard never reached the control.');
}

test.describe('NFR4: diner additions at 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('the Menu, the allergy panel and Chef\'s Dice have no sideways scrolling', async ({ page }) => {
    await openMenuReady(page, WIDTH_TABLE);
    await expectNoSidewaysScroll(page);

    await page.getByTestId('menu-allergies').click();
    await expect(page.getByTestId('allergy-panel')).toBeVisible();
    await expectNoSidewaysScroll(page);
    await page.getByTestId('allergy-done').click();

    await page.getByTestId('menu-chefs-dice').click();
    await expect(page.getByTestId('dice-roll')).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  for (const view of ['table', 'kitchen', 'bottle']) {
    test(`the ${view} view on My orders has no sideways scrolling`, async ({ page }) => {
      await page.goto(`/table/${WIDTH_TABLE}/orders`);
      await page.getByTestId(`orders-view-${view}`).click();
      await expect(page.getByTestId(`orders-view-${view}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
      await expectNoSidewaysScroll(page);
    });
  }
});

test.describe('NFR4: staff additions at 1024 px', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('the board has no sideways scrolling', async ({ page }) => {
    await openBoardLive(page);
    await expect(page.getByTestId(`board-table-${WIDTH_TABLE}`)).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

test('NFR6: the new diner and staff controls work by keyboard alone', async ({ page, context }) => {
  await archiveOpenVisit(KEYBOARD_TABLE);
  await openMenuReady(page, KEYBOARD_TABLE);

  const opener = page.getByTestId('menu-allergies');
  await tabTo(page, opener);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('allergy-panel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();

  const waiter = page.getByTestId('request-waiter');
  await tabTo(page, waiter);
  await page.keyboard.press('Enter');
  await expect(waiter).toContainText('staff told');

  const board = await context.newPage();
  await openBoardLive(board);
  const respond = board.getByTestId(`board-respond-${KEYBOARD_TABLE}-waiter`);
  await tabTo(board, respond);
  await board.keyboard.press('Enter');
  await expect(respond).toHaveCount(0);
});
