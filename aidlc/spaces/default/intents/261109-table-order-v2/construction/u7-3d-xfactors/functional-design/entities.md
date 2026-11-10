# Entities: U7 3D X-factors

From `unit-of-work.md`, `unit-of-work-story-map.md`, `stories.md`, `requirements.md`, `components.md` and `contract-summary.md`. U5 owns ItemMood and the allergy store. Orders are read from what My orders already holds.

```yaml
entities:
  - name: Spin
    description: One bottle spin for a visit. It records seats and a result, and never a person's name or a payment.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: visitId, type: reference, required: true, references: Visit }
      - { name: question, type: enum, required: true, allowed: [tab, dessert] }
      - { name: seats, type: integer, required: true, min: 2, max: 8 }
      - { name: resultSeat, type: integer, required: true, min: 1 }
      - { name: startedAt, type: timestamp, required: true }
    constraints: [resultSeat is no greater than seats]
    relationships:
      - { to: Visit, cardinality: many-to-one }
  - name: Plate
    description: A view value on the Living Table, one per unit of quantity in a non-Cancelled order. Never stored.
    attributes:
      - { name: dishName, type: text, required: true }
      - { name: state, type: enum, required: true, allowed: [covered, steaming, uncovered] }
    relationships: []
  - name: Ticket
    description: A view value in Kitchen Theatre, one per non-Cancelled order. Never stored.
    attributes:
      - { name: orderNumber, type: integer, required: true }
      - { name: station, type: enum, required: true, allowed: [rail-start, stove, pass] }
    relationships: []
  - name: DiceRoll
    description: A choice worked out on the diner's device. Never stored.
    attributes:
      - { name: mood, type: enum, required: true, allowed: [light, hearty, sweet, surprise] }
      - { name: suggestedItemId, type: text, required: false }
    relationships: []
```

Spin is the only database addition. It is add-only and belongs to U7's `migrations()`.

## Assumptions & Open Questions

- [assumption] "Surprise me" draws from every dish that qualifies, whatever its mood.
