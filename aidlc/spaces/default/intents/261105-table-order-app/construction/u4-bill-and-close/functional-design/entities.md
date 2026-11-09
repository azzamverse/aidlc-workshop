# Entities: u4-bill-and-close

U4 stores nothing new. It reads U1's Visit and Order through contract C4, and derives the Bill from them.

```yaml
entities:
  - name: Bill
    description: A derived view of the table's current visit. It is never stored.
    attributes:
      - { name: tableId, type: integer, required: true, references: Table }
      - { name: orders, type: list of Order, required: true, constraints: "every order of the current visit except Cancelled, oldest first" }
      - { name: openOrders, type: "list of { number, status }", required: true, constraints: "orders that are Pending or Preparing" }
      - { name: totalCents, type: integer, required: true, min: 0, constraints: "sum of the listed orders' totals" }
      - { name: canClose, type: boolean, required: true, constraints: "the visit has at least one order, and none is open" }
    relationships:
      - { to: Visit, cardinality: "one bill for at most one current visit", direction: "Bill reads Visit" }
```

## Summary

The Bill is a calculation, so it can never disagree with the orders. A table with no current visit has an empty bill.
