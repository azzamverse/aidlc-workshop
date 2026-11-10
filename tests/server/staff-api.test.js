import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server/app.js';
import { createTestContext, placementFor, signInStaff, TEST_PIN } from './context-helper.js';

function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
}

const STAFF_ONLY = [
  ['get', '/api/tables'],
  ['get', '/api/tables/5/bill'],
  ['post', '/api/tables/5/close'],
  ['put', '/api/orders/any/status'],
  ['put', '/api/menu/items/coffee/sold-out'],
  ['get', '/api/events'],
  ['get', '/api/staff/session'],
];

describe('staff API', () => {
  let context;
  let app;

  beforeEach(() => {
    context = createTestContext();
    app = createApp(context, { distDir: context.folder, isTestMode: false });
  });

  afterEach(() => context.cleanup());

  const sendPin = (pin) => request(app).post('/api/staff/session').send({ pin });

  it('the right PIN answers 204 with a cookie scripts cannot read and no expiry', async () => {
    const response = await sendPin(TEST_PIN);
    expect(response.status).toBe(204);
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toMatch(/^staff_session=[0-9a-f]{64};/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).not.toMatch(/Expires|Max-Age/i);
  });

  it('a wrong PIN answers 401 PIN_WRONG with the screen\'s words, and sets no cookie', async () => {
    const response = await sendPin('0000');
    expectError(response, 401, 'PIN_WRONG');
    expect(response.body.error.message).toBe("That PIN isn't right");
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('a missing or non-text PIN is a wrong PIN', async () => {
    expectError(await request(app).post('/api/staff/session').send({}), 401, 'PIN_WRONG');
    expectError(await sendPin(4826), 401, 'PIN_WRONG');
  });

  it('the fifth wrong PIN answers 429 PIN_LOCKED, and so does the right one after it', async () => {
    for (let tries = 0; tries < 4; tries += 1) expectError(await sendPin('0000'), 401, 'PIN_WRONG');
    expectError(await sendPin('0000'), 429, 'PIN_LOCKED');
    expectError(await sendPin(TEST_PIN), 429, 'PIN_LOCKED');
  });

  it('a request-level lockout ends 30 seconds later on the injected clock', async () => {
    const clock = { value: 5_000 };
    const timed = createTestContext({ now: () => clock.value });
    try {
      const timedApp = createApp(timed, { distDir: timed.folder, isTestMode: false });
      const send = (pin) => request(timedApp).post('/api/staff/session').send({ pin });
      for (let tries = 0; tries < 5; tries += 1) await send('0000');
      clock.value += 29_999;
      expectError(await send(TEST_PIN), 429, 'PIN_LOCKED');
      clock.value += 1;
      expect((await send(TEST_PIN)).status).toBe(204);
    } finally {
      timed.cleanup();
    }
  });

  it.each(STAFF_ONLY)('%s %s answers 401 STAFF_REQUIRED with no session', async (method, url) => {
    expectError(await request(app)[method](url), 401, 'STAFF_REQUIRED');
  });

  it('a refused staff request changes nothing', async () => {
    const { visitId } = (await request(app).get('/api/tables/5')).body;
    const { body: order } = await request(app).post('/api/tables/5/orders').send(placementFor(visitId));
    await request(app).put(`/api/orders/${order.id}/status`).send({ from: 'Pending', to: 'Preparing' });
    await request(app).put('/api/menu/items/coffee/sold-out').send({ soldOut: true });
    await request(app).post('/api/tables/5/close');
    const { orders } = (await request(app).get('/api/tables/5/orders')).body;
    expect(orders[0].status).toBe('Pending');
    const coffee = context.menu.getMenu().categories.flatMap((category) => category.items).find((item) => item.id === 'coffee');
    expect(coffee.soldOut).toBe(false);
  });

  it('with a session, GET session answers 204 and the staff routes open', async () => {
    const { staff } = await signInStaff(app);
    expect((await staff.get('/api/staff/session')).status).toBe(204);
    expect((await staff.get('/api/tables')).status).toBe(200);
    expect((await staff.get('/api/tables/5/bill')).status).toBe(200);
  });

  it('a made-up cookie opens nothing', async () => {
    const response = await request(app).get('/api/tables').set('Cookie', 'staff_session=abc');
    expectError(response, 401, 'STAFF_REQUIRED');
  });

  it('the lockout reset exists only under test', async () => {
    expect((await request(app).post('/api/test/staff/reset-lockout')).status).toBe(404);
    const testApp = createApp(context, { distDir: context.folder, isTestMode: true });
    for (let tries = 0; tries < 5; tries += 1) await request(testApp).post('/api/staff/session').send({ pin: '0000' });
    expect((await request(testApp).post('/api/test/staff/reset-lockout')).status).toBe(204);
    expect((await request(testApp).post('/api/staff/session').send({ pin: TEST_PIN })).status).toBe(204);
  });

  it('registers every feature module, which can use requireStaff and parsed bodies', async () => {
    const registerRoutes = vi.fn((featureApp, featureContext) => {
      featureApp.post('/api/requests/:id/respond', featureContext.requireStaff, (req, res) => res.json(req.body));
    });
    const withFeature = createApp({ ...context, features: [{ registerRoutes }] }, { distDir: context.folder, isTestMode: false });
    expect(registerRoutes).toHaveBeenCalledOnce();
    expectError(await request(withFeature).post('/api/requests/1/respond').send({}), 401, 'STAFF_REQUIRED');
    const { staff } = await signInStaff(withFeature);
    expect((await staff.post('/api/requests/1/respond').send({ done: true })).body).toEqual({ done: true });
  });
});
