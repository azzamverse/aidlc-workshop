import { randomUUID } from 'node:crypto';
import {
  AppError,
  orderNotFound,
  orderStateConflict,
  validationFailed,
} from '../platform/errors.js';

const MAX_QUANTITY = 20;
const MAX_KEY_LENGTH = 200;
const NEXT_STATUS = new Map([
  ['Pending', 'Preparing'],
  ['Preparing', 'Completed'],
]);

const isNonEmptyText = (value) => typeof value === 'string' && value.length > 0;

function validatePlacement(body) {
  const { visitId, placementKey, lines } = body ?? {};
  if (!isNonEmptyText(visitId)) throw validationFailed('visitId is required.');
  if (!isNonEmptyText(placementKey) || placementKey.length > MAX_KEY_LENGTH) {
    throw validationFailed('placementKey is required.');
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    throw validationFailed('An order needs at least one item.');
  }
  for (const line of lines) {
    const quantity = line?.quantity;
    if (!isNonEmptyText(line?.itemId)) throw validationFailed('Every line needs an item.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw validationFailed(`A quantity must be from 1 to ${MAX_QUANTITY}.`);
    }
  }
  return { visitId, placementKey, lines };
}

export function createOrderingService({
  repo,
  menuRepo,
  tablesRepo,
  tablesService,
  transactions,
  publishEvent,
  now = Date.now,
}) {
  /** Looks up every line's item; an unknown item refuses the whole order (BR2.1). */
  function resolveItems(lines) {
    return lines.map((line) => {
      const item = menuRepo.findItem(line.itemId);
      if (!item) throw validationFailed(`Unknown menu item: ${line.itemId}.`);
      return { line, item };
    });
  }

  function refuseSoldOut(resolved) {
    const soldOutItemIds = [
      ...new Set(resolved.filter(({ item }) => item.soldOut).map(({ item }) => item.id)),
    ];
    if (soldOutItemIds.length > 0) {
      throw new AppError(409, 'ITEM_SOLD_OUT', 'An item in this order has sold out.', { soldOutItemIds });
    }
  }

  function createOrder(table, placement, resolved) {
    const id = randomUUID();
    repo.insertOrder({
      id,
      number: repo.nextNumber(),
      visitId: placement.visitId,
      placementKey: placement.placementKey,
      placedAt: new Date(now()).toISOString(),
      lines: resolved.map(({ line, item }) => ({
        id: randomUUID(),
        itemId: item.id,
        name: item.name,
        unitPriceCents: item.priceCents,
        quantity: line.quantity,
      })),
    });
    const order = repo.findById(id);
    publishEvent({ type: 'order.placed', tableId: table.id, order });
    publishEvent({ type: 'queue.changed', tableId: null });
    return order;
  }

  /** Places an order. Returns { order, created }; created is false for a repeated key. */
  function placeOrder(rawTableId, body) {
    const table = tablesService.requireTable(rawTableId);
    const placement = validatePlacement(body);
    return transactions.withTransaction(() => {
      const resolved = resolveItems(placement.lines);
      const existing = repo.findByPlacementKey(placement.placementKey);
      if (existing) {
        if (existing.tableId !== table.id) {
          throw validationFailed('This placementKey belongs to another table.');
        }
        return { order: existing, created: false };
      }
      if (tablesRepo.findOpenVisit(table.id)?.id !== placement.visitId) {
        throw new AppError(409, 'TABLE_CLOSED', 'This table was closed.');
      }
      refuseSoldOut(resolved);
      return { order: createOrder(table, placement, resolved), created: true };
    });
  }

  function changeStatus(order, from, to) {
    if (!repo.updateStatusIfCurrent(order.id, from, to)) throw orderStateConflict(order.status);
    const updated = repo.findById(order.id);
    publishEvent({ type: 'order.updated', tableId: updated.tableId, order: updated });
    publishEvent({ type: 'queue.changed', tableId: null });
    return updated;
  }

  /** A diner cancels a Pending order of their table's current visit (BR3.1). */
  function cancelOrder(rawTableId, orderId) {
    return transactions.withTransaction(() => {
      const order = repo.findById(orderId);
      const currentVisit = order ? tablesRepo.findOpenVisit(order.tableId) : null;
      if (!order || String(order.tableId) !== String(rawTableId) || currentVisit?.id !== order.visitId) {
        throw orderNotFound();
      }
      return changeStatus(order, 'Pending', 'Cancelled');
    });
  }

  /** Staff move an order one step (BR3.2); the shape is checked first, then staleness (BR7.4). */
  function moveOrder(orderId, body) {
    const { from, to } = body ?? {};
    if (typeof to !== 'string' || NEXT_STATUS.get(from) !== to) {
      throw validationFailed('An order can only move one step forward.');
    }
    return transactions.withTransaction(() => {
      const order = repo.findById(orderId);
      if (!order) throw orderNotFound();
      return changeStatus(order, from, to);
    });
  }

  return { placeOrder, cancelOrder, moveOrder };
}
