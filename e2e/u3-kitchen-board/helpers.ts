import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const LIVE_LIMIT_MS = 2000;

/** Marks the table's open visit closed, as U4's close will. */
export function archiveOpenVisit(tableId: number, dbFile = process.env.E2E_DB_FILE as string) {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    db.prepare("UPDATE visits SET status = 'Closed', closed_at = ? WHERE table_id = ? AND status = 'Open'").run(new Date().toISOString(), tableId);
  } finally {
    db.close();
  }
}

/** A server the test can really stop, on E2E_PORT + 200. */
export function createOwnServer(name: string) {
  const port = Number(process.env.E2E_PORT ?? 3100) + 200;
  const url = `http://localhost:${port}`;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), `table-order-u3-${name}-`));
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
    stop,
    async start() {
      server = spawn(process.execPath, ['server/index.js'], {
        env: { ...process.env, PORT: String(port), DB_FILE: path.join(folder, 'own.db'), NODE_ENV: 'test' },
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

export type Line = { itemId: string; quantity: number };

export async function placeByApi(request: APIRequestContext, tableId: number, lines: Line[], base = '') {
  const { visitId } = await (await request.get(`${base}/api/tables/${tableId}`)).json();
  const response = await request.post(`${base}/api/tables/${tableId}/orders`, {
    data: { visitId, placementKey: randomUUID(), lines },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function moveByApi(request: APIRequestContext, orderId: string, from: string, to: string) {
  const response = await request.put(`/api/orders/${orderId}/status`, { data: { from, to } });
  expect(response.status()).toBe(200);
}

export async function cancelByApi(request: APIRequestContext, tableId: number, orderId: string) {
  const response = await request.post(`/api/tables/${tableId}/orders/${orderId}/cancel`);
  expect(response.status()).toBe(200);
}

export async function setSoldOut(request: APIRequestContext, itemId: string, soldOut: boolean) {
  const response = await request.put(`/api/menu/items/${itemId}/sold-out`, { data: { soldOut } });
  expect(response.status()).toBe(200);
}

export async function closeTable(request: APIRequestContext, tableId: number) {
  const { visitId } = await (await request.get(`/api/tables/${tableId}`)).json();
  archiveOpenVisit(tableId);
  const response = await request.post('/api/test/events', { data: { type: 'table.closed', tableId, visitId } });
  expect(response.status()).toBe(201);
}

/** Opens the board and waits for the stream and for the read its connection starts. */
export async function openBoardLive(page: Page, base = '') {
  await page.goto(`${base}/staff`);
  await expect(page.getByTestId('staff-live')).toHaveText(/Live/);
  await expect(page.getByTestId('board').locator('.table-card')).toHaveCount(10);
}
