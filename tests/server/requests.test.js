import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { createTestContext, placementFor, signInStaff } from './context-helper.js';

describe('table requests', () => {
  let context;
  let app;
  let staff;
  let frames;

  const ask = (kind, tableId = 5) => request(app).post(`/api/tables/${tableId}/requests`).send({ kind });
  const forTable = async (tableId = 5) => (await request(app).get(`/api/tables/${tableId}/requests`)).body.requests;
  const requestEvents = () => frames.filter((frame) => frame.includes('event: table-request.updated'));

  function finishOrdersAndClose() {
    const { visitId } = context.tables.openTable(5);
    const { order } = context.ordering.placeOrder(5, placementFor(visitId));
    context.ordering.cancelOrder(5, order.id);
    return staff.post('/api/tables/5/close');
  }

  beforeEach(async () => {
    context = createTestContext();
    app = createApp(context, { distDir: context.folder, isTestMode: true });
    ({ staff } = await signInStaff(app));
    frames = [];
    context.live.subscribe({ tableId: null, send: (frame) => frames.push(frame) });
  });

  afterEach(() => context.cleanup());

  describe('making a request', () => {
    beforeEach(() => context.tables.openTable(5));

    it('creates a waiting request and tells the table\'s stream', async () => {
      const response = await ask('waiter');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ tableId: 5, kind: 'waiter', status: 'waiting' });
      expect(requestEvents()).toHaveLength(1);
      expect(requestEvents()[0]).toContain('"kind":"waiter"');
      expect(requestEvents()[0]).toContain('"status":"waiting"');
    });

    it('a repeat returns the same request and publishes nothing', async () => {
      const first = await ask('bill');
      const second = await ask('bill');
      expect(second.body.id).toBe(first.body.id);
      expect(requestEvents()).toHaveLength(1);
      expect(await forTable()).toHaveLength(1);
    });

    it('two presses at once make one request', async () => {
      const [first, second] = await Promise.all([ask('waiter'), ask('waiter')]);
      expect(second.body.id).toBe(first.body.id);
      expect(await forTable()).toHaveLength(1);
      expect(requestEvents()).toHaveLength(1);
    });

    it('waiter and bill can wait together', async () => {
      await ask('waiter');
      await ask('bill');
      expect((await forTable()).map((one) => one.kind).sort()).toEqual(['bill', 'waiter']);
    });

    it('refuses an unknown kind', async () => {
      const response = await ask('dessert');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  it('refuses a request with 409 when no visit is open, and starts none', async () => {
    const response = await ask('waiter');
    expect(response.status).toBe(409);
    expect(context.tables.getCurrentVisit(5)).toBeNull();
  });

  it('answers 404 for an unknown table', async () => {
    expect((await ask('waiter', 99)).status).toBe(404);
    expect((await request(app).get('/api/tables/99/requests')).status).toBe(404);
  });

  it('a table sees only its own requests', async () => {
    context.tables.openTable(5);
    context.tables.openTable(6);
    await ask('waiter', 5);
    expect(await forTable(6)).toEqual([]);
  });

  describe('responding', () => {
    let waiter;
    let bill;

    beforeEach(async () => {
      context.tables.openTable(5);
      waiter = (await ask('waiter')).body;
      bill = (await ask('bill')).body;
    });

    it('clears exactly one request and publishes the change', async () => {
      const response = await staff.post(`/api/requests/${waiter.id}/respond`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('responded');
      expect(response.body.respondedAt).toEqual(expect.any(String));
      expect((await forTable()).map((one) => one.id)).toEqual([bill.id]);
      expect(requestEvents().at(-1)).toContain('"status":"responded"');
    });

    it('401 without a session, for Respond and the all-requests read', async () => {
      expect((await request(app).post(`/api/requests/${waiter.id}/respond`)).status).toBe(401);
      expect((await request(app).get('/api/requests')).status).toBe(401);
      expect(await forTable()).toHaveLength(2);
    });

    it('404 for an unknown id', async () => {
      const response = await staff.post('/api/requests/no-such-id/respond');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('REQUEST_NOT_FOUND');
    });

    it('a repeat returns the request unchanged and publishes nothing', async () => {
      const first = await staff.post(`/api/requests/${waiter.id}/respond`);
      const published = requestEvents().length;
      const second = await staff.post(`/api/requests/${waiter.id}/respond`);
      expect(second.body).toEqual(first.body);
      expect(requestEvents()).toHaveLength(published);
    });

    it('a new request can wait after a response', async () => {
      await staff.post(`/api/requests/${waiter.id}/respond`);
      const again = await ask('waiter');
      expect(again.body.id).not.toBe(waiter.id);
      expect(again.body.status).toBe('waiting');
    });

    it('the all-requests read lists every waiting request with its table', async () => {
      const { requests } = (await staff.get('/api/requests')).body;
      expect(requests.map((one) => [one.tableId, one.kind]).sort()).toEqual([[5, 'bill'], [5, 'waiter']]);
    });

    it('closing the table ends the requests, and a late Respond changes nothing', async () => {
      expect((await finishOrdersAndClose()).status).toBe(200);
      expect((await staff.get('/api/requests')).body.requests).toEqual([]);
      expect(await forTable()).toEqual([]);
      const published = requestEvents().length;
      const late = await staff.post(`/api/requests/${waiter.id}/respond`);
      expect(late.status).toBe(200);
      expect(late.body.status).toBe('waiting');
      expect(requestEvents()).toHaveLength(published);
    });

    it('the next visit starts with no requests', async () => {
      await finishOrdersAndClose();
      context.tables.openTable(5);
      expect(await forTable()).toEqual([]);
      expect((await ask('waiter')).body.id).not.toBe(waiter.id);
    });
  });
});
