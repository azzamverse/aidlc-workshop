import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { signInStaff, createTestContext, placementFor } from './context-helper.js';

const pizzaId = 'margherita-pizza';
const large = `${pizzaId}-size-large`;
const regular = `${pizzaId}-size-regular`;
const hot = `${pizzaId}-spice-hot`;
const medium = `${pizzaId}-spice-medium`;
const cheese = `${pizzaId}-extras-extra-cheese`;

describe('options and pricing', () => {
  let context;
  let app;
  let visitId;

  const place = (lines, overrides = {}) =>
    request(app).post('/api/tables/5/orders').send(placementFor(visitId, { lines, ...overrides }));
  const pizzaLine = (optionIds, quantity = 1) => ({ itemId: pizzaId, quantity, optionIds });
  const orderCount = () => context.db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;

  beforeEach(() => {
    context = createTestContext();
    app = createApp(context, { distDir: context.folder, isTestMode: true });
    visitId = context.tables.openTable(5).visitId;
  });

  afterEach(() => context.cleanup());

  it('prices a line from its option ids, in exact cents', async () => {
    const response = await place([pizzaLine([large, hot, cheese], 2)]);
    expect(response.status).toBe(201);
    expect(response.body.lines[0].unitPriceCents).toBe(1200 + 300 + 150);
    expect(response.body.totalCents).toBe(3300);
  });

  it('records non-default and priced choices in menu order, and leaves free defaults out', async () => {
    const response = await place([pizzaLine([cheese, hot, regular])]);
    expect(response.body.lines[0].options).toEqual([
      { optionId: hot, name: 'Hot', priceDeltaCents: 0 },
      { optionId: cheese, name: 'Extra cheese', priceDeltaCents: 150 },
    ]);
  });

  it('a group left out takes its default, and an empty list means the defaults', async () => {
    const leftOut = await place([pizzaLine([large])]);
    expect(leftOut.body.lines[0].unitPriceCents).toBe(1500);
    expect(leftOut.body.lines[0].options.map((option) => option.name)).toEqual(['Large']);
    const empty = await place([pizzaLine([])]);
    expect(empty.status).toBe(201);
    expect(empty.body.lines[0].unitPriceCents).toBe(1200);
  });

  it('a free-default order has exactly v1\'s shape', async () => {
    const response = await place([{ itemId: 'coffee', quantity: 2 }]);
    expect(response.body.lines).toEqual([{ name: 'Coffee', quantity: 2, unitPriceCents: 250 }]);
    expect(Object.keys(response.body).sort()).toEqual(['id', 'lines', 'number', 'placedAt', 'status', 'tableId', 'totalCents', 'visitId']);
    const defaults = await place([pizzaLine([regular, medium])]);
    expect(defaults.body.lines[0]).toEqual({ name: 'Margherita Pizza', quantity: 1, unitPriceCents: 1200 });
  });

  it.each([
    ['an option of another dish', ['coffee-size-large']],
    ['an unknown option', ['no-such-option']],
    ['two in one pick-one group', [large, regular]],
    ['a repeated id', [cheese, cheese]],
    ['a list of something other than text', [7]],
  ])('refuses %s with 400 INVALID_OPTIONS and places no order', async (_name, optionIds) => {
    const response = await place([pizzaLine(optionIds)]);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_OPTIONS');
    expect(orderCount()).toBe(0);
  });

  it('refuses an optionIds that is not a list', async () => {
    const response = await place([pizzaLine('large')]);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_OPTIONS');
  });

  it('one invalid line refuses the whole order', async () => {
    const response = await place([{ itemId: 'coffee', quantity: 1 }, pizzaLine(['no-such-option'])]);
    expect(response.status).toBe(400);
    expect(orderCount()).toBe(0);
  });

  it('checks choices before the sold-out check', async () => {
    context.menu.setSoldOut(pizzaId, true);
    expect((await place([pizzaLine(['no-such-option'])])).body.error.code).toBe('INVALID_OPTIONS');
    expect((await place([pizzaLine([large])])).body.error.code).toBe('ITEM_SOLD_OUT');
  });

  it('a repeated placement key returns the existing order and stores nothing twice', async () => {
    const lines = [pizzaLine([large])];
    const first = await place(lines, { placementKey: 'same-key' });
    const second = await place(lines, { placementKey: 'same-key' });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM order_line_options').get().count).toBe(1);
  });

  it('a menu change never alters a placed order', async () => {
    const { body } = await place([pizzaLine([large])]);
    context.db.exec(`UPDATE options SET name = 'Huge', price_delta_cents = 999 WHERE id = '${large}'`);
    const { orders } = context.tables.listCurrentOrders(5);
    expect(orders.find((order) => order.id === body.id).lines[0].options[0]).toEqual({ optionId: large, name: 'Large', priceDeltaCents: 300 });
  });

  it('options reach the bill, the board and the live event, and the bill adds them up', async () => {
    const events = [];
    context.live.subscribe({ tableId: 5, send: (frame) => events.push(frame) });
    await place([pizzaLine([large, hot], 2)]);
    const { staff } = await signInStaff(app);
    const bill = (await staff.get('/api/tables/5/bill')).body;
    expect(bill.orders[0].lines[0].options.map((option) => option.name)).toEqual(['Large', 'Hot']);
    expect(bill.totalCents).toBe(3000);
    const board = (await staff.get('/api/tables')).body;
    expect(board.tables.find((table) => table.id === 5).orders[0].lines[0].options).toHaveLength(2);
    expect(events.find((frame) => frame.includes('order.placed'))).toContain('"Large"');
  });
});
