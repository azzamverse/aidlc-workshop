# Intent Statement: Table Order

## Problem Statement

Diners wait for staff to take their order and cannot see how it is progressing, while staff juggle orders without one live view of every table. [Q1]

Ordering from the table, a live kitchen board and a one-click bill and close remove the wait and the guesswork. [Q1]

The work is to build the Table Order web app. [desc]

## Target Customer

| Who | What they use | How they benefit | Source |
|---|---|---|---|
| Diners seated at a table | The customer view at `/table/:id` (opening `/table/5` stands in for scanning a QR code) | They order at the table and can see how their order is progressing | [Q1] [Q2] |
| Restaurant staff, with floor and kitchen staff sharing one view | The staff view at `/staff` | They have one live view of every table, and can bill and close a table | [Q1] [Q2] |

## Success Metrics

Later stages test the product against these measures. [Q3]

| ID | Measure | How it passes | Source |
|---|---|---|---|
| SM1 | A new order reaches the staff board | It appears within 2 seconds, highlighted | [Q3] |
| SM2 | A status change reaches the diner | A change to Pending, Preparing or Completed shows on the diner's view | [Q3] |
| SM3 | The cart survives a refresh | The cart is unchanged after a page refresh | [Q3] |
| SM4 | Closing a table works | The visit is archived and the table is reset | [Q3] |
| SM5 | The screens match their mockups | The five built screens (Menu, Cart, My Orders, Kitchen Board, Table Bill) match their mockups | [Q3] |
| SM6 | The app starts with one command | `npm install && npm start` starts everything at http://localhost:3000 | [Q3] |

## Initiative Trigger

This is the workshop exercise: the team builds a realistic app end to end in one session of about 5 hours, with AI-DLC guiding each step. [Q5]

## Initial Scope Signal

Workflow-selected: `dpl-workshop`. [scope]

User-confirmed product boundary: this first version leaves out payments, QR code generation, multi-language, menu management, past-visit history, notifications and cloud deployment. [Q4]

It runs locally only. [Q4]

## Assumptions & Open Questions

- [assumption] The brief's five open questions are decided when requirements are written: they are the first questions of Requirements Analysis.
- [assumption] SM2's time limit is 2 seconds, the same as SM1's. Requirements Analysis confirms or changes it.
- [assumption] After a table is closed, its customer view shows an empty cart and no orders, ready for the next diner. Requirements Analysis confirms or changes it.
- [assumption] The success measures check that the product is delivered and works. They do not measure restaurant outcomes such as waiting time.
