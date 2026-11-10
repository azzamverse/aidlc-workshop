import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { createU7Feature, SPIN_MS } from '../../server/features/u7.js';
import { createTestContext } from './context-helper.js';

const TABLE = 3;
const VALID = { question: 'tab', seats: 4 };

describe('spin the bottle', () => {
  let context;
  let app;
  let clock;
  const seatsAsked = [];

  const open = async (table = TABLE) => (await request(app).get(`/api/tables/${table}`)).body;
  const spin = (body = VALID, table = TABLE) => request(app).post(`/api/tables/${table}/spin`).send(body);
  const read = (table = TABLE) => request(app).get(`/api/tables/${table}/spin`);
  const expectRefused = (response, status, code) => {
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  };

  beforeEach(() => {
    clock = Date.parse('2026-11-10T12:00:00.000Z');
    seatsAsked.length = 0;
    const feature = createU7Feature({
      now: () => clock,
      pickSeat: (seats) => {
        seatsAsked.push(seats);
        return seats;
      },
    });
    context = createTestContext({ features: [feature] });
    app = createApp(context, { distDir: context.folder, isTestMode: false });
  });

  afterEach(() => context.cleanup());

  it('starts a spin and returns it with the server-chosen seat', async () => {
    const { visitId } = await open();
    const response = await spin();
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ visitId, question: 'tab', seats: 4, resultSeat: 4, elapsedMs: 0 });
    expect(seatsAsked).toEqual([4]);
  });

  it('ignores a seat the caller tries to choose', async () => {
    await open();
    const response = await spin({ ...VALID, resultSeat: 1 });
    expect(response.body.resultSeat).toBe(4);
  });

  it('refuses when the table has no open visit, and starts none', async () => {
    expectRefused(await spin(), 409, 'NO_OPEN_VISIT');
    expect(context.shared.getCurrentVisit(TABLE)).toBeNull();
  });

  it.each([
    ['1 seat', { question: 'tab', seats: 1 }],
    ['9 seats', { question: 'tab', seats: 9 }],
    ['half a seat', { question: 'tab', seats: 2.5 }],
    ['seats as words', { question: 'tab', seats: '4' }],
    ['no seats', { question: 'tab' }],
    ['another question', { question: 'dishes', seats: 4 }],
    ['no question', { seats: 4 }],
  ])('refuses %s', async (_name, body) => {
    await open();
    expectRefused(await spin(body), 400, 'INVALID_SPIN');
  });

  it.each(['99', 'abc'])('answers 404 for unknown table %s on both routes', async (table) => {
    expectRefused(await spin(VALID, table), 404, 'TABLE_NOT_FOUND');
    expectRefused(await read(table), 404, 'TABLE_NOT_FOUND');
  });

  it('lets one of two spins at once through', async () => {
    await open();
    const responses = await Promise.all([spin(), spin()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM spins').get().count).toBe(1);
  });

  it('refuses until 5 seconds after the start, then allows the next', async () => {
    await open();
    await spin();
    clock += SPIN_MS - 1;
    expectRefused(await spin(), 409, 'SPIN_ACTIVE');
    clock += 1;
    expect((await spin()).status).toBe(201);
  });

  it('a spin on one table does not block another', async () => {
    await open(3);
    await open(4);
    await spin(VALID, 3);
    expect((await spin(VALID, 4)).status).toBe(201);
  });

  it('a read during a spin returns it with the server\'s elapsed time', async () => {
    await open();
    const started = (await spin()).body;
    clock += 1800;
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...started, elapsedMs: 1800 });
  });

  it('a read after a spin, or with no visit, returns null and starts no visit', async () => {
    expect((await read()).body).toBeNull();
    expect(context.shared.getCurrentVisit(TABLE)).toBeNull();
    await open();
    await spin();
    clock += SPIN_MS;
    expect((await read()).body).toBeNull();
  });

  it('publishes spin.started once, after commit, only to this table', async () => {
    await open();
    const own = [];
    const other = [];
    const closeOwn = context.live.subscribe({ tableId: TABLE, send: (frame) => own.push(frame) });
    const closeOther = context.live.subscribe({ tableId: 4, send: (frame) => other.push(frame) });
    const started = (await spin()).body;
    closeOwn();
    closeOther();
    const frames = own.filter((frame) => frame.includes('event: spin.started'));
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain(`"resultSeat":${started.resultSeat}`);
    expect(frames[0]).toContain('"elapsedMs":0');
    expect(other.join('')).not.toContain('spin.started');
  });

  it('a refused spin publishes nothing and keeps the current spin', async () => {
    await open();
    const started = (await spin()).body;
    const frames = [];
    const close = context.live.subscribe({ tableId: TABLE, send: (frame) => frames.push(frame) });
    await spin();
    close();
    expect(frames.join('')).not.toContain('spin.started');
    expect((await read()).body.id).toBe(started.id);
  });

  it('records no name or payment field', async () => {
    await open();
    const { body } = await spin({ ...VALID, name: 'Sam', payment: 'card' });
    expect(Object.keys(body).sort()).toEqual(['elapsedMs', 'id', 'question', 'resultSeat', 'seats', 'startedAt', 'visitId']);
  });
});

describe('the default module', () => {
  it('picks a real seat within range', async () => {
    const context = createTestContext();
    const app = createApp(context, { distDir: context.folder, isTestMode: false });
    try {
      await request(app).get(`/api/tables/${TABLE}`);
      const { resultSeat } = (await request(app).post(`/api/tables/${TABLE}/spin`).send({ question: 'dessert', seats: 2 })).body;
      expect([1, 2]).toContain(resultSeat);
    } finally {
      context.cleanup();
    }
  });
});
