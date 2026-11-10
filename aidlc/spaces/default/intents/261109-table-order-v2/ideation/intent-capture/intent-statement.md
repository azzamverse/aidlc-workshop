# Intent Statement: Table Order v2

The request is to build Table Order v2 from the follow-up brief. [desc]

## Problem Statement

Independent sit-down restaurants need an ordering app that serves diners better and keeps staff on top of busy service, and v1 only covers the basics. [Q4]

## Target Customer

Independent sit-down restaurants are the customer, and their diners and staff are the people who benefit. [Q4]

## Chosen Features

| Group | Feature | What it does | Source |
|---|---|---|---|
| Left out of v1 | Notifications | The diner is told when an order is ready, and staff are alerted to new orders. | [Q1] |
| Left out of v1 | Staff PIN | The staff view asks for a PIN. | [Q1] |
| Most apps don't have | Allergy shield | The diner sets their allergies once, unsafe dishes are marked on the menu, and the cart warns before an unsafe order is placed. | [Q2] |
| Most apps don't have | Make it yours | Items have options such as spice level, no onions, extra cheese or size, which change the price and show on the kitchen ticket. | [Q2] |
| X-factor | Call the waiter / Ask for the bill | Buttons make the table's card pulse for staff until they respond. | [Q3] |
| X-factor | Animated order tracker | Pending, Preparing and Completed appear as a progress bar with the estimated wait. | [Q3] |

## Success Metrics

- Every chosen feature and X-factor works in a 5-minute demo. [Q5]
- `npm test && npm run test:e2e` passes, with v1's tests included. [Q5]

## Initiative Trigger

v1 only covers the basics, and restaurants need a reason to choose this app over its competitors. [Q4]

## Initial Scope Signal

- Workflow-selected scope: `dpl-workshop`, workflow-selected. [scope]
- This version leaves out payments, native mobile apps, cloud deployment, diner accounts, email or SMS, and anything that needs a paid external service. [Q6]

## Assumptions & Open Questions

- [assumption] The team's Product Owner decides scope and priority, as the brief's open questions say; the restaurant owner, diners and staff influence those decisions.
