# Entities: u1-walking-skeleton

From `unit-of-work.md`, `components.md`, `contract-summary.md`, `requirements.md` and `stories.md`.

```yaml
entities:
  - name: MenuCategory
    description: A menu section
    attributes:
      - { name: id, type: identifier, required: true, unique: true }
      - { name: name, type: text, required: true, allowed: [Starters, Mains, Desserts, Drinks] }
      - { name: position, type: whole number, required: true, unique: true }
  - name: MenuItem
    description: Something a diner can order
    attributes:
      - { name: id, type: identifier, required: true, unique: true }
      - { name: categoryId, type: reference, required: true, references: MenuCategory }
      - { name: name, type: text, required: true }
      - { name: description, type: text, required: true }
      - { name: priceCents, type: whole number, required: true, min: 1 }
      - { name: image, type: text, required: true, constraints: one emoji }
      - { name: soldOut, type: yes/no, required: true, default: no }
      - { name: position, type: whole number, required: true }
    relationships: [each item belongs to one category; a category has 3 items in the seed]
  - name: Table
    description: One of the 10 restaurant tables
    attributes:
      - { name: id, type: whole number, required: true, unique: true, min: 1, max: 10 }
      - { name: label, type: text, required: true }
  - name: Visit
    description: One sitting at a table, from the first time it is opened until it is closed
    attributes:
      - { name: id, type: identifier, required: true, unique: true }
      - { name: tableId, type: reference, required: true, references: Table }
      - { name: status, type: choice, required: true, allowed: [Open, Closed], default: Open }
      - { name: startedAt, type: instant, required: true }
      - { name: closedAt, type: instant, required: false }
    constraints: [a table has at most one Open visit]
  - name: Order
    description: What a device placed for a visit
    attributes:
      - { name: id, type: identifier, required: true, unique: true }
      - { name: number, type: whole number, required: true, unique: true, constraints: rising across the restaurant }
      - { name: visitId, type: reference, required: true, references: Visit }
      - { name: status, type: choice, required: true, allowed: [Pending, Preparing, Completed, Cancelled], default: Pending }
      - { name: placementKey, type: text, required: true, unique: true }
      - { name: placedAt, type: instant, required: true }
    relationships: [each order belongs to one visit and has one or more lines]
  - name: OrderLine
    description: One item in an order, keeping its name and price at order time
    attributes:
      - { name: id, type: identifier, required: true, unique: true }
      - { name: orderId, type: reference, required: true, references: Order }
      - { name: itemId, type: reference, required: true, references: MenuItem }
      - { name: name, type: text, required: true }
      - { name: unitPriceCents, type: whole number, required: true }
      - { name: quantity, type: whole number, required: true, min: 1, max: 20 }
  - name: LiveEvent
    description: One published change, kept for catch-up
    attributes:
      - { name: sequence, type: whole number, required: true, unique: true, constraints: rising }
      - { name: type, type: choice, required: true, allowed: [order.placed, order.updated, menu.item-updated, table.closed] }
      - { name: tableId, type: whole number, required: false, constraints: empty for menu events }
      - { name: payload, type: structured data, required: true }
      - { name: createdAt, type: instant, required: true }
```

## Summary

Menu holds 4 categories and 12 items. Tables holds 10 tables and their visits, with at most one open per table. Ordering holds orders and lines. Lines copy the name and price so later menu changes never alter an order. LiveUpdates keeps one hour of events. U1 owns all of these; the Cart lives in U2.

## Assumptions & Open Questions

- `image` holds the emoji.
- Order numbers start at 1 and rise across the restaurant.
