import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, SCREEN_ROUTES } from '../../server/app.js';
import { createTestContext, placementFor, signInStaff } from './context-helper.js';

/** Dist in a dot-folder, as in a Bolt's worktree under .aidlc/worktrees/. */
function createDist(folder) {
  const distDir = path.join(folder, '.aidlc', 'worktrees', 'bolt', 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), '<title>Table Order shell</title>');
  return distDir;
}

function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
  expect(typeof response.body.error.message).toBe('string');
}

describe('API', () => {
  let context;
  let app;
  let distDir;
  let staff;
  let staffCookie;

  const openTable = async (id = 5) => (await request(app).get(`/api/tables/${id}`)).body.visitId;
  const place = (visitId, overrides, tableId = 5) =>
    request(app).post(`/api/tables/${tableId}/orders`).send(placementFor(visitId, overrides));

  beforeEach(async () => {
    context = createTestContext();
    distDir = createDist(context.folder);
    app = createApp(context, { distDir, isTestMode: false });
    ({ staff, cookie: staffCookie } = await signInStaff(app));
  });

  afterEach(() => context.cleanup());

  describe('menu', () => {
    it('GET /api/menu returns the categories with items', async () => {
      const response = await request(app).get('/api/menu');
      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(4);
      expect(response.body.categories[0].items[0]).toHaveProperty('priceCents', 450);
    });

    it('a failed menu read is a logged 500 with a safe message', async () => {
      context.db.close();
      const response = await request(app).get('/api/menu');
      expectError(response, 500, 'INTERNAL_ERROR');
      expect(response.body.error.message).not.toMatch(/database|sqlite/i);
      expect(context.log.errors).toHaveLength(1);
    });

    it('PUT sold-out stores the mark, returns the item, and refuses bad requests', async () => {
      const url = '/api/menu/items/coffee/sold-out';
      const response = await staff.put(url).send({ soldOut: true });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: 'coffee', soldOut: true });
      expectError(await staff.put(url).send({}), 400, 'VALIDATION_FAILED');
      expectError(
        await staff.put('/api/menu/items/nope/sold-out').send({ soldOut: true }),
        404,
        'ITEM_NOT_FOUND',
      );
    });
  });

  describe('tables', () => {
    it('GET /api/tables lists all 10 without starting a visit', async () => {
      const response = await staff.get('/api/tables');
      expect(response.status).toBe(200);
      expect(response.body.tables).toHaveLength(10);
      expect(response.body.tables.every((table) => table.visitId === null)).toBe(true);
    });

    it('GET /api/tables/:id returns the table and starts its visit', async () => {
      const response = await request(app).get('/api/tables/5');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 5, label: 'Table 5', visitId: expect.any(String) });
      const board = await staff.get('/api/tables');
      expect(board.body.tables[4].visitId).toBe(response.body.visitId);
    });

    it('unknown tables are refused on both reads', async () => {
      expectError(await request(app).get('/api/tables/99'), 404, 'TABLE_NOT_FOUND');
      expectError(await request(app).get('/api/tables/abc/orders'), 404, 'TABLE_NOT_FOUND');
    });

    it('GET orders is an empty list for a new visit', async () => {
      await openTable();
      expect((await request(app).get('/api/tables/5/orders')).body).toEqual({ orders: [] });
    });
  });

  describe('placing', () => {
    it('201 for a new order in the Order shape, and it shows on the board', async () => {
      const visitId = await openTable();
      const response = await place(visitId);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        number: 1,
        tableId: 5,
        visitId,
        status: 'Pending',
        placedAt: expect.any(String),
        totalCents: 500,
        lines: [{ name: 'Coffee', quantity: 2, unitPriceCents: 250 }],
      });
      const board = await staff.get('/api/tables');
      expect(board.body.tables[4].orders[0].id).toBe(response.body.id);
    });

    it('200 with the first order for a repeated key', async () => {
      const visitId = await openTable();
      const first = await place(visitId, { placementKey: 'same' });
      const second = await place(visitId, { placementKey: 'same' });
      expect(second.status).toBe(200);
      expect(second.body.id).toBe(first.body.id);
    });

    it('refuses each invalid placement with the shared shape', async () => {
      const visitId = await openTable();
      expectError(await place(visitId, { lines: [] }), 400, 'VALIDATION_FAILED');
      expectError(await place(visitId, {}, 99), 404, 'TABLE_NOT_FOUND');
      expectError(await place('old-visit'), 409, 'TABLE_CLOSED');
    });

    it('names the sold-out items in the refusal', async () => {
      const visitId = await openTable();
      context.menu.setSoldOut('coffee', true);
      const response = await place(visitId);
      expectError(response, 409, 'ITEM_SOLD_OUT');
      expect(response.body.error.soldOutItemIds).toEqual(['coffee']);
    });

    it('a malformed JSON body is a 400 in the shared shape', async () => {
      const response = await request(app)
        .post('/api/tables/5/orders')
        .set('Content-Type', 'application/json')
        .send('{not json');
      expectError(response, 400, 'VALIDATION_FAILED');
    });

    it('stores markup as plain data', async () => {
      const visitId = await openTable();
      const response = await place(visitId, { placementKey: '<script>alert(1)</script>' });
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('moving and cancelling', () => {
    it('PUT status moves one step and refuses the rest', async () => {
      const { body: order } = await place(await openTable());
      const url = `/api/orders/${order.id}/status`;
      expectError(await staff.put(url).send({ from: 'Pending', to: 'Completed' }), 400, 'VALIDATION_FAILED');
      const moved = await staff.put(url).send({ from: 'Pending', to: 'Preparing' });
      expect(moved.status).toBe(200);
      expect(moved.body.status).toBe('Preparing');
      const stale = await staff.put(url).send({ from: 'Pending', to: 'Preparing' });
      expectError(stale, 409, 'ORDER_STATE_CONFLICT');
      expect(stale.body.error.currentStatus).toBe('Preparing');
      expectError(
        await staff.put('/api/orders/nope/status').send({ from: 'Pending', to: 'Preparing' }),
        404,
        'ORDER_NOT_FOUND',
      );
    });

    it('POST cancel cancels, then refuses a repeat with the current status', async () => {
      const { body: order } = await place(await openTable());
      const url = `/api/tables/5/orders/${order.id}/cancel`;
      const cancelled = await request(app).post(url);
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.status).toBe('Cancelled');
      const again = await request(app).post(url);
      expectError(again, 409, 'ORDER_STATE_CONFLICT');
      expect(again.body.error.currentStatus).toBe('Cancelled');
    });

    it('cancelling from another table is not found', async () => {
      const { body: order } = await place(await openTable());
      expectError(await request(app).post(`/api/tables/2/orders/${order.id}/cancel`), 404, 'ORDER_NOT_FOUND');
    });

    it('concurrent cancel and move requests: one wins, the other is told', async () => {
      const { body: order } = await place(await openTable());
      const [moved, cancelled] = await Promise.all([
        staff.put(`/api/orders/${order.id}/status`).send({ from: 'Pending', to: 'Preparing' }),
        request(app).post(`/api/tables/5/orders/${order.id}/cancel`),
      ]);
      expect([moved.status, cancelled.status].sort()).toEqual([200, 409]);
    });
  });

  describe('live stream over HTTP', () => {
    let server;
    let abort;

    const readUntil = async (reader, text) => {
      const decoder = new TextDecoder();
      let received = '';
      while (!received.includes(text)) {
        const { value, done } = await reader.read();
        if (done) break;
        received += decoder.decode(value);
      }
      return received;
    };

    beforeEach(async () => {
      abort = new AbortController();
      await new Promise((resolve) => {
        server = app.listen(0, resolve);
      });
    });

    afterEach(async () => {
      abort.abort();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    });

    const openStream = async (query = '', headers = {}) => {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/api/events${query}`, { signal: abort.signal, headers });
      return { response, reader: response.ok ? response.body.getReader() : null };
    };

    it('streams an order placed after connecting', async () => {
      const { response, reader } = await openStream('?tableId=5');
      expect(response.headers.get('content-type')).toMatch(/^text\/event-stream/);
      await readUntil(reader, 'id: 0');
      const visitId = await openTable();
      await place(visitId);
      expect(await readUntil(reader, 'order.placed')).toContain('event: order.placed');
    });

    it('replays from the Last-Event-ID header', async () => {
      const visitId = await openTable();
      await place(visitId);
      const { reader } = await openStream('', { 'Last-Event-ID': '0', Cookie: staffCookie });
      expect(await readUntil(reader, 'order.placed')).toContain('id: 1');
    });

    it('refuses a stream for an unknown table', async () => {
      const { response } = await openStream('?tableId=99');
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe('TABLE_NOT_FOUND');
    });
  });

  describe('test-only route', () => {
    it('does not exist outside test mode', async () => {
      const response = await request(app).post('/api/test/events').send({ type: 'table.closed', tableId: 5 });
      expectError(response, 404, 'NOT_FOUND');
    });

    it('publishes table.closed in test mode and refuses other types', async () => {
      const testApp = createApp(context, { distDir, isTestMode: true });
      const frames = [];
      context.live.subscribe({ send: (frame) => frames.push(frame) });
      const response = await request(testApp)
        .post('/api/test/events')
        .send({ type: 'table.closed', tableId: 5, visitId: 'v1' });
      expect(response.status).toBe(201);
      expect(frames.at(-1)).toContain('{"sequence":1,"tableId":5,"visitId":"v1"}');
      const refused = await request(testApp).post('/api/test/events').send({ type: 'order.placed', tableId: 5 });
      expectError(refused, 400, 'VALIDATION_FAILED');
    });
  });

  describe('screens and unknown addresses', () => {
    it.each(SCREEN_ROUTES.map((route) => route.replace(':id', '5')))(
      '%s serves the shell, even from a dot-folder',
      async (address) => {
        const response = await request(app).get(address);
        expect(response.status).toBe(200);
        expect(response.text).toContain('Table Order shell');
      },
    );

    it('the root address leads to the staff view', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/staff');
    });

    it('an unknown API address is a 404 in the shared shape, not the shell', async () => {
      expectError(await request(app).get('/api/nope'), 404, 'NOT_FOUND');
    });

    it('a missing build is reported as a logged 500', async () => {
      fs.rmSync(path.join(distDir, 'index.html'));
      const response = await request(app).get('/staff');
      expectError(response, 500, 'INTERNAL_ERROR');
      expect(context.log.errors).toHaveLength(1);
    });

    it('a malformed address is a 400 in the shared shape', async () => {
      expectError(await request(app).get('/api/tables/%E0%A4%A'), 400, 'VALIDATION_FAILED');
    });
  });
});
