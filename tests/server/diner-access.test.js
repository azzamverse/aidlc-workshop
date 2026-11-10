import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { createTestContext, placementFor, signInStaff } from './context-helper.js';

describe('diner access', () => {
  let context;
  let app;

  beforeEach(() => {
    context = createTestContext();
    app = createApp(context, { distDir: context.folder, isTestMode: false });
  });

  afterEach(() => context.cleanup());

  describe('the visit read', () => {
    it('returns only this table, and starts no visit', async () => {
      const response = await request(app).get('/api/tables/3/visit');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 3, label: 'Table 3', visitId: null });
      expect(context.shared.getCurrentVisit(3)).toBeNull();
    });

    it('returns the open visit id once there is one', async () => {
      const { visitId } = (await request(app).get('/api/tables/3')).body;
      expect((await request(app).get('/api/tables/3/visit')).body.visitId).toBe(visitId);
    });

    it.each(['99', 'abc', '5.5'])('answers 404 for the unknown table %s', async (id) => {
      const response = await request(app).get(`/api/tables/${id}/visit`);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TABLE_NOT_FOUND');
    });
  });

  describe('open diner routes need no PIN', () => {
    it('opens a table, places, reads and cancels', async () => {
      const { visitId } = (await request(app).get('/api/tables/4')).body;
      const placed = await request(app).post('/api/tables/4/orders').send(placementFor(visitId));
      expect(placed.status).toBe(201);
      expect((await request(app).get('/api/tables/4/orders')).body.orders).toHaveLength(1);
      expect((await request(app).post(`/api/tables/4/orders/${placed.body.id}/cancel`)).status).toBe(200);
      expect((await request(app).get('/api/menu')).status).toBe(200);
    });
  });

  describe('the live split', () => {
    const framesFor = (tableId, lastEventId = null) => {
      const frames = [];
      const close = context.live.subscribe({ tableId, lastEventId, send: (frame) => frames.push(frame) });
      return { frames, close, text: () => frames.join('') };
    };

    const openAndPlace = async (tableId) => {
      const { visitId } = (await request(app).get(`/api/tables/${tableId}`)).body;
      return (await request(app).post(`/api/tables/${tableId}/orders`).send(placementFor(visitId))).body;
    };

    it('a table stream gets its own events and queue.changed, never another table\'s', async () => {
      const stream = framesFor(3);
      await openAndPlace(4);
      expect(stream.text()).not.toContain('order.placed');
      expect(stream.text()).toContain('event: queue.changed');
      await openAndPlace(3);
      expect(stream.text()).toContain('event: order.placed');
      stream.close();
    });

    it('replay follows the same filter', async () => {
      await openAndPlace(4);
      await openAndPlace(3);
      const stream = framesFor(3, 0);
      expect((stream.text().match(/event: order\.placed/g) ?? [])).toHaveLength(1);
      expect(stream.text()).toContain('"tableId":3');
      expect(stream.text()).not.toContain('"tableId":4');
      stream.close();
    });

    it('a table stream drops a no-table event that is not one of the two named', () => {
      const stream = framesFor(3);
      context.shared.publishEvent({ type: 'kitchen.secret', tableId: null, note: 'x' });
      expect(stream.text()).not.toContain('kitchen.secret');
      stream.close();
    });

    it('the all-tables stream still gets everything', async () => {
      const stream = framesFor(null);
      await openAndPlace(4);
      expect(stream.text()).toContain('event: order.placed');
      stream.close();
    });

    it('queue.changed goes out on place, status change and cancel, with no order data', async () => {
      const stream = framesFor(9);
      const order = await openAndPlace(9);
      const { staff } = await signInStaff(app);
      await staff.put(`/api/orders/${order.id}/status`).send({ from: 'Pending', to: 'Preparing' });
      const second = await openAndPlace(9);
      await request(app).post(`/api/tables/9/orders/${second.id}/cancel`);
      const queueFrames = stream.frames.filter((frame) => frame.includes('event: queue.changed'));
      expect(queueFrames).toHaveLength(4);
      expect(queueFrames.join('')).not.toContain('"order"');
      stream.close();
    });
  });

  describe('menu details', () => {
    const menuItems = async () => (await request(app).get('/api/menu')).body.categories.flatMap((category) => category.items);

    it('every item carries allergens, a mood and optionGroups', async () => {
      const items = await menuItems();
      expect(items).toHaveLength(12);
      for (const item of items) {
        expect(Array.isArray(item.allergens)).toBe(true);
        expect(['light', 'hearty', 'sweet']).toContain(item.mood);
        expect(Array.isArray(item.optionGroups)).toBe(true);
      }
    });

    it('returns the option shape from the contract, in position order', async () => {
      const pizza = (await menuItems()).find((item) => item.id === 'margherita-pizza');
      expect(pizza.allergens).toEqual(['dairy', 'gluten']);
      expect(pizza.optionGroups.map((group) => [group.name, group.kind])).toEqual([['Size', 'one'], ['Spice', 'one'], ['Extras', 'any']]);
      expect(pizza.optionGroups[0].options).toEqual([
        { id: 'margherita-pizza-size-regular', name: 'Regular', priceDeltaCents: 0, isDefault: true },
        { id: 'margherita-pizza-size-large', name: 'Large', priceDeltaCents: 300, isDefault: false },
      ]);
    });

    it('an order keeps exactly v1\'s fields', async () => {
      const { visitId } = (await request(app).get('/api/tables/2')).body;
      const { body } = await request(app).post('/api/tables/2/orders').send(placementFor(visitId));
      expect(Object.keys(body.lines[0]).sort()).not.toContain('optionIds');
      expect(Object.keys(body)).not.toContain('allergens');
    });

    it('a sold-out write still returns the v1 item shape', async () => {
      const { staff } = await signInStaff(app);
      const { body } = await staff.put('/api/menu/items/coffee/sold-out').send({ soldOut: true });
      expect(Object.keys(body).sort()).toEqual(['description', 'id', 'image', 'name', 'priceCents', 'soldOut']);
    });
  });
});
