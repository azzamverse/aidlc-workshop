import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type APIRequestContext } from '@playwright/test';

export const LIVE_LIMIT_MS = 2000;

export type Line = { itemId: string; quantity: number };
export const coffee: Line[] = [{ itemId: 'coffee', quantity: 1 }];

export async function placeByApi(request: APIRequestContext, tableId: number, lines: Line[], base = '') {
  const { visitId } = await (await request.get(`${base}/api/tables/${tableId}`)).json();
  const response = await request.post(`${base}/api/tables/${tableId}/orders`, { data: { visitId, placementKey: randomUUID(), lines } });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function moveByApi(request: APIRequestContext, orderId: string, from: string, to: string, base = '') {
  const response = await request.put(`${base}/api/orders/${orderId}/status`, { data: { from, to } });
  expect(response.status()).toBe(200);
}

export async function completeByApi(request: APIRequestContext, orderId: string, base = '') {
  await moveByApi(request, orderId, 'Pending', 'Preparing', base);
  await moveByApi(request, orderId, 'Preparing', 'Completed', base);
}

export async function cancelByApi(request: APIRequestContext, tableId: number, orderId: string) {
  const response = await request.post(`/api/tables/${tableId}/orders/${orderId}/cancel`);
  expect(response.status()).toBe(200);
}

/** Leaves the table with no visit, using only the real routes. */
export async function resetTable(request: APIRequestContext, tableId: number) {
  const extra = await placeByApi(request, tableId, coffee);
  await cancelByApi(request, tableId, extra.id);
  const { orders } = await (await request.get(`/api/tables/${tableId}/orders`)).json();
  for (const order of orders) {
    if (order.status === 'Pending') await cancelByApi(request, tableId, order.id);
    if (order.status === 'Preparing') await moveByApi(request, order.id, 'Preparing', 'Completed');
  }
  expect((await request.post(`/api/tables/${tableId}/close`)).status()).toBe(200);
}

/** A server the test can really stop, on E2E_PORT + 200. */
export function createOwnServer(name: string) {
  const port = Number(process.env.E2E_PORT ?? 3100) + 200;
  const url = `http://localhost:${port}`;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), `table-order-u4-${name}-`));
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
