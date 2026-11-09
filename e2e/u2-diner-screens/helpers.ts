import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const LIVE_LIMIT_MS = 2000;

/** Marks the table's open visit closed, as U4's close will. U4's route does not exist yet. */
export function archiveOpenVisit(tableId: number, dbFile = process.env.E2E_DB_FILE as string) {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    db.prepare("UPDATE visits SET status = 'Closed', closed_at = ? WHERE table_id = ? AND status = 'Open'").run(
      new Date().toISOString(),
      tableId,
    );
  } finally {
    db.close();
  }
}

/**
 * A server the test can really stop, on E2E_PORT + 200. Playwright's offline mode
 * leaves an open event stream running, so it cannot simulate a lost connection.
 */
export function createOwnServer(name: string) {
  const port = Number(process.env.E2E_PORT ?? 3100) + 200;
  const url = `http://localhost:${port}`;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), `table-order-u2-${name}-`));
  const dbFile = path.join(folder, 'own.db');
  let server: ChildProcess | undefined;

  async function stop() {
    const stopping = server;
    server = undefined;
    if (!stopping || stopping.exitCode !== null) return;
    await new Promise((resolve) => {
      stopping.once('exit', resolve);
      stopping.kill('SIGKILL');
    });
  }

  return {
    url,
    dbFile,
    stop,
    async start() {
      server = spawn(process.execPath, ['server/index.js'], {
        env: { ...process.env, PORT: String(port), DB_FILE: dbFile, NODE_ENV: 'test' },
        stdio: 'ignore',
      });
      await expect
        .poll(() => fetch(`${url}/api/menu`).then((response) => response.ok, () => false), { timeout: 15_000 })
        .toBe(true);
    },
    async remove() {
      await stop();
      fs.rmSync(folder, { recursive: true, force: true });
    },
  };
}

export async function visitOf(request: APIRequestContext, tableId: number, base = ''): Promise<string> {
  return (await (await request.get(`${base}/api/tables/${tableId}`)).json()).visitId;
}

/** A real close: the visit is archived, then table.closed is published. */
export async function closeTable(request: APIRequestContext, tableId: number) {
  const visitId = await visitOf(request, tableId);
  archiveOpenVisit(tableId);
  const response = await request.post('/api/test/events', { data: { type: 'table.closed', tableId, visitId } });
  expect(response.status()).toBe(201);
  return visitId;
}

export async function placeByApi(
  request: APIRequestContext,
  tableId: number,
  lines: { itemId: string; quantity: number }[],
  base = '',
) {
  const visitId = await visitOf(request, tableId, base);
  const response = await request.post(`${base}/api/tables/${tableId}/orders`, {
    data: { visitId, placementKey: randomUUID(), lines },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function moveByApi(request: APIRequestContext, orderId: string, from: string, to: string, base = '') {
  const response = await request.put(`${base}/api/orders/${orderId}/status`, { data: { from, to } });
  expect(response.status()).toBe(200);
}

export async function setSoldOut(request: APIRequestContext, itemId: string, soldOut: boolean) {
  const response = await request.put(`/api/menu/items/${itemId}/sold-out`, { data: { soldOut } });
  expect(response.status()).toBe(200);
}

export async function cancelByApi(request: APIRequestContext, tableId: number, orderId: string) {
  const response = await request.post(`/api/tables/${tableId}/orders/${orderId}/cancel`);
  expect(response.status()).toBe(200);
}

export const add = (page: Page, itemId: string) => page.getByTestId(`menu-add-${itemId}`).click();

export async function openMenuReady(page: Page, tableId: number) {
  await page.goto(`/table/${tableId}`);
  await expect(page.getByTestId('menu-pills')).toBeVisible();
}

/** Waits until the screen's live stream is open and its first visit check has been answered. */
export async function liveReady(page: Page, action: () => Promise<unknown>) {
  const answered = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/tables');
  await action();
  await answered;
}
