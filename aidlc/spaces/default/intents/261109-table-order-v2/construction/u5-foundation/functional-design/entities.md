# Entities: U5 Foundation

From `unit-of-work.md`, `components.md`, `contract-summary.md` and `requirements.md`.

```yaml
entities:
  - name: SchemaUpgrade
    description: One add-only database step already applied.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: appliedAt, type: timestamp, required: true }
    relationships: []
  - name: ItemAllergen
    description: One allergen a menu item contains. An item with no rows contains none of the eight.
    attributes:
      - { name: itemId, type: reference, required: true, references: MenuItem }
      - { name: allergen, type: enum, required: true, allowed: [gluten, dairy, eggs, nuts, peanuts, soy, fish, shellfish] }
    constraints: [itemId and allergen are unique together]
    relationships:
      - { to: MenuItem, cardinality: many-to-one }
  - name: ItemMood
    description: The one mood of a menu item.
    attributes:
      - { name: itemId, type: reference, required: true, unique: true, references: MenuItem }
      - { name: mood, type: enum, required: true, allowed: [light, hearty, sweet] }
    relationships:
      - { to: MenuItem, cardinality: one-to-one }
  - name: OptionGroup
    description: A set of choices on a menu item.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: itemId, type: reference, required: true, references: MenuItem }
      - { name: name, type: text, required: true }
      - { name: kind, type: enum, required: true, allowed: [one, any] }
      - { name: position, type: integer, required: true, min: 0 }
    relationships:
      - { to: MenuItem, cardinality: many-to-one }
  - name: Option
    description: One choice in a group.
    attributes:
      - { name: id, type: text, required: true, unique: true }
      - { name: groupId, type: reference, required: true, references: OptionGroup }
      - { name: name, type: text, required: true }
      - { name: priceDeltaCents, type: integer, required: true, min: 0, default: 0 }
      - { name: isDefault, type: boolean, required: true, default: false }
      - { name: position, type: integer, required: true, min: 0 }
    constraints: [A pick-one group has exactly one default, A pick-any group has no default]
    relationships:
      - { to: OptionGroup, cardinality: many-to-one }
  - name: StaffSession
    description: A signed-in staff browser, held in server memory, so a server restart ends it.
    attributes:
      - { name: token, type: random secret, required: true, unique: true }
      - { name: createdAt, type: timestamp, required: true }
    relationships: []
  - name: PinAttempts
    description: Wrong tries from one network address, held in server memory.
    attributes:
      - { name: address, type: text, required: true, unique: true }
      - { name: wrongCount, type: integer, required: true, min: 0, default: 0 }
      - { name: lockedUntil, type: timestamp, required: false }
    relationships: []
```

The two database additions are the menu details and the record of applied steps. Staff sessions and wrong-try counts live only in memory. U6's and U7's tables are defined in their own designs.

## Assumptions & Open Questions

- Sessions are held in memory, because a staff session only has to last until the browser closes, and a restart simply returns staff to the PIN screen.
