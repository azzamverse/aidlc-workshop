# Business Overview

## Current State

The `table-order` repo describes a product that has not been built. It holds a product brief and a question script, and no application. Everything below comes from those documents, not from running software.

## Business Domain and Purpose

Restaurant table ordering. Diners order from their table through a web app, and staff see orders live, update their status and close out tables (`ideas/table-order/IDEA.md` lines 3-5).

The repo is also a workshop exercise: `ideas/table-order/QUESTIONS.md` is the fixed question script for building the app in a session of about 5 hours. This is the script's recommended answer on why the app is being built (line 68), and the team has not yet confirmed it in this run.

## Users

| User | View | Route |
|---|---|---|
| Diner seated at a table | Customer view | `/table/:id`; `/table/5` stands in for a QR scan |
| Restaurant staff | Staff view | `/staff` |

## Key Functionality and Build Status

| Feature | What the brief asks for | Built today |
|---|---|---|
| 1. Order from the table | Browse the menu by category (name, price, description, image) | No |
| 1. Order from the table | Cart: add and remove, change quantity, live total, survives a page refresh | No |
| 1. Order from the table | Place an order and show its order number | No |
| 1. Order from the table | "My orders": this visit's orders with live status | No |
| 2. Live kitchen board | Grid of table cards; a new order appears within 2 seconds, highlighted | No |
| 2. Live kitchen board | Status moves Pending to Preparing to Completed, and the customer view updates | No |
| 3. Bill and close table | Open a table to see an itemised bill and total | No |
| 3. Bill and close table | "Close table" archives the visit and resets the table for the next diner | No |

## Stated Constraints

- One responsive web app with two views.
- Seed data: 10 tables, 4 categories, 12 menu items.
- Runs locally only: `npm install && npm start` starts everything, and the app opens at http://localhost:3000.
- High-fidelity mockups are required as styled, standalone HTML files with an `index.html` linking all screens, and the built app must match them.
- Five screens: Menu, Cart, My Orders, Kitchen Board, Table Bill.

## Out of Scope

Payments, QR code generation, multi-language, menu management, past-visit history, notifications and cloud deployment (`IDEA.md` lines 34-35).

## Undecided Business Rules

The brief leaves these five questions to the Product Owner (`IDEA.md` lines 27-31). The script offers options and recommends one for each, but nothing is decided yet.

| Question | Script's recommended option (not a decision) |
|---|---|
| Can a customer cancel an order, and up to which status? | Yes, while Pending |
| Can a table be closed while orders are Pending or Preparing? | No, not until every order is Completed or Cancelled |
| What access do staff need? | None; the staff view opens directly because the app runs locally |
| What happens if an item sells out mid-service? | Staff mark it sold out, diners cannot add it, and placing an order removes it from the cart |
| Is the bill one combined total, or listed per order? | Listed per order, then one combined total |

## Points the Brief Leaves Open

- The brief sets the 2-second limit for a new order reaching the board only. It gives no limit for a status change reaching the diner; the script assumes 2 seconds (`QUESTIONS.md` line 183).
- The brief says "this visit's orders" for "My orders". The script assumes this means the whole table's orders for the visit, with each device keeping its own cart (line 184).
- The recommended answers add behaviour beyond the brief: a Cancelled status and a sold-out mark. The script treats the mark as not being menu management (line 189) and treats archived visits as stored but shown nowhere (line 191), to fit the out-of-scope list.

Document inconsistencies are recorded in [code-quality-assessment.md](code-quality-assessment.md).
