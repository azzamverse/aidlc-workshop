import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { createTestContext, placementFor, signInStaff } from './context-helper.js';

function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
  expect(typeof response.body.error.message).toBe('string');
}

describe('Billing API', () => {
  let context;
  let app;
  let staff;

  async function placeOrder() {
    const { visitId } = (await request(app).get('/api/tables/5')).body;
    return (await request(app).post('/api/tables/5/orders').send(placementFor(visitId))).body;
  }

  async function finish(order) {
    await staff.put(`/api/orders/${order.id}/status`).send({ from: 'Pending', to: 'Preparing' });
    await staff.put(`/api/orders/${order.id}/status`).send({ from: 'Preparing', to: 'Completed' });
  }

  beforeEach(async () => {
    context = createTestContext();
    app = createApp(context, { distDir: context.folder, isTestMode: false });
    ({ staff } = await signInStaff(app));
  });

  afterEach(() => context.cleanup());

  it('GET bill returns the C3 shape', async () => {
    const order = await placeOrder();
    const response = await staff.get('/api/tables/5/bill');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tableId: 5,
      openOrders: [{ number: order.number, status: 'Pending' }],
      totalCents: order.totalCents,
      canClose: false,
    });
    expect(response.body.orders[0].id).toBe(order.id);
  });

  it('GET bill for a table with no visit is empty and starts none', async () => {
    const response = await staff.get('/api/tables/6/bill');
    expect(response.body).toEqual({ tableId: 6, orders: [], openOrders: [], totalCents: 0, canClose: false });
    const board = await staff.get('/api/tables');
    expect(board.body.tables.find((table) => table.id === 6).visitId).toBeNull();
  });

  it.each([['get', '/api/tables/99/bill'], ['post', '/api/tables/99/close'], ['get', '/api/tables/abc/bill']])(
    '%s %s answers TABLE_NOT_FOUND',
    async (method, address) => {
      expectError(await staff[method](address), 404, 'TABLE_NOT_FOUND');
    },
  );

  it('POST close refuses open orders, in the shared error shape', async () => {
    await placeOrder();
    expectError(await staff.post('/api/tables/5/close'), 409, 'TABLE_NOT_READY');
  });

  it('POST close refuses a visit with no orders', async () => {
    await request(app).get('/api/tables/5');
    expectError(await staff.post('/api/tables/5/close'), 409, 'TABLE_NOT_READY');
  });

  it('POST close succeeds, a repeat too, and placing on the old visit is refused', async () => {
    const order = await placeOrder();
    await finish(order);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await staff.post('/api/tables/5/close');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ closed: true });
    }
    const stale = await request(app).post('/api/tables/5/orders').send(placementFor(order.visitId));
    expectError(stale, 409, 'TABLE_CLOSED');
    expect((await request(app).get('/api/tables/5/orders')).body.orders).toEqual([]);
  });

  it('a failure inside the close answers 500 and leaves the visit open', async () => {
    const order = await placeOrder();
    await finish(order);
    const broken = createApp(
      {
        ...context,
        shared: {
          ...context.shared,
          publishEvent() {
            throw new Error('event store failed');
          },
        },
      },
      { distDir: context.folder, isTestMode: false },
    );
    const { staff: brokenStaff } = await signInStaff(broken);
    expectError(await brokenStaff.post('/api/tables/5/close'), 500, 'INTERNAL_ERROR');
    expect(context.log.errors).toHaveLength(1);
    expect(context.shared.getCurrentVisit(5).id).toBe(order.visitId);
  });
});
