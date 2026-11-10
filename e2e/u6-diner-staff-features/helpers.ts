import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export { add, archiveOpenVisit, closeTable, liveReady, moveByApi, openMenuReady, placeByApi, setSoldOut, visitOf } from '../u2-diner-screens/helpers';
export { openBoardLive } from '../u3-kitchen-board/helpers';

export const PIZZA = 'margherita-pizza';
export const LARGE = `${PIZZA}-size-large`;
export const HOT = `${PIZZA}-spice-hot`;
export const CHEESE = `${PIZZA}-extras-extra-cheese`;

/** Finishes every open order in the database, so the wait estimate starts from nothing. */
export function finishAllOpenOrders(dbFile = process.env.E2E_DB_FILE as string) {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec("UPDATE orders SET status = 'Cancelled' WHERE status IN ('Pending', 'Preparing')");
  } finally {
    db.close();
  }
}

export async function placeOptions(
  request: APIRequestContext,
  tableId: number,
  lines: { itemId: string; quantity: number; optionIds?: string[] }[],
) {
  const { visitId } = await (await request.get(`/api/tables/${tableId}`)).json();
  const response = await request.post(`/api/tables/${tableId}/orders`, { data: { visitId, placementKey: randomUUID(), lines } });
  expect(response.status()).toBe(201);
  return response.json();
}

/** Waits until this device has saved the order's status as last seen. */
export async function waitSeen(page: Page, tableId: number, orderId: string, status: string) {
  await expect
    .poll(() => page.evaluate(([table, order]) => {
      const saved = JSON.parse(localStorage.getItem(`table-order.notify.${table}`) ?? 'null');
      return saved?.lastSeen?.[order] ?? null;
    }, [tableId, orderId] as const))
    .toBe(status);
}

/** Marks allergens through the real panel. */
export async function chooseAllergens(page: Page, allergens: string[]) {
  await page.getByTestId('menu-allergies').click();
  for (const allergen of allergens) await page.getByTestId(`allergy-${allergen}`).click();
  await page.getByTestId('allergy-done').click();
}

export async function customizeAndAdd(page: Page, itemId: string, optionIds: string[]) {
  await page.getByTestId(`menu-customize-${itemId}`).click();
  for (const optionId of optionIds) await page.getByTestId(`customize-option-${optionId}`).check();
  await page.getByTestId('customize-add').click();
  await expect(page.getByTestId('customize-panel')).toHaveCount(0);
}
