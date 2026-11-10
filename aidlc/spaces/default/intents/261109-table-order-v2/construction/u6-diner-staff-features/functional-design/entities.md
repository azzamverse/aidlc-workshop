# Entities: U6 Diner and Staff Features

From `unit-of-work.md`, `unit-of-work-story-map.md`, `stories.md`, `requirements.md`, `components.md` and `contract-summary.md`. U5 owns the menu details (OptionGroup, Option, ItemAllergen, ItemMood).

```yaml
entities:
  - name: OrderLineOption
    description: A snapshot of one recorded choice on an order line (non-default or priced), so later menu changes never alter a placed order.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: orderLineId, type: reference, required: true, references: OrderLine }
      - { name: optionId, type: text, required: true }
      - { name: name, type: text, required: true }
      - { name: priceDeltaCents, type: integer, required: true, min: 0 }
      - { name: position, type: integer, required: true, min: 0 }
    constraints: [orderLineId and optionId are unique together]
    relationships:
      - { to: OrderLine, cardinality: many-to-one }
  - name: TableRequest
    description: A diner's call for the waiter or for the bill, belonging to one visit.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: visitId, type: reference, required: true, references: Visit }
      - { name: kind, type: enum, required: true, allowed: [waiter, bill] }
      - { name: status, type: enum, required: true, allowed: [waiting, responded], default: waiting }
      - { name: createdAt, type: timestamp, required: true }
      - { name: respondedAt, type: timestamp, required: false }
    constraints: [At most one waiting request per visit and kind]
    relationships:
      - { to: Visit, cardinality: many-to-one }
  - name: DeviceNotificationState
    description: What one device remembers for banners, held in that browser's storage per table.
    attributes:
      - { name: visitId, type: text, required: false }
      - { name: lastSeenStatusByOrder, type: map of order id to status, required: true, default: empty }
      - { name: dismissedOrderIds, type: list of order ids, required: true, default: empty }
    relationships: []
  - name: DeviceMute
    description: Whether sound and vibration are off on this device. Diner screens and the kitchen board each keep their own.
    attributes:
      - { name: scope, type: enum, required: true, allowed: [diner, kitchen] }
      - { name: muted, type: boolean, required: true, default: false }
    relationships: []
  - name: WaitEstimate
    description: A value worked out on each read and never stored.
    attributes:
      - { name: estimateMinutes, type: integer, required: true, min: 10 }
    relationships: []
```

The two database additions are OrderLineOption and TableRequest. Both are add-only and survive a restart. The other entities live on the device or are worked out on read.

## Assumptions & Open Questions

- [assumption] Non-default choices, and any default that changes the price, are recorded and shown, so every charge has words beside it. A line using free defaults keeps exactly v1's order shape.
- [assumption] "+ Add" sends no option ids, so the server applies the defaults.
