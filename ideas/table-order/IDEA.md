# Table Order Web App

## Intent
Diners order from their table through a web app; staff see orders live,
update status, and close out tables.

## Format
One responsive web app, two views:
- Customer view: /table/:id   (e.g. /table/5 — stands in for a QR scan)
- Staff view:    /staff

## Feature 1 — Order from the table (Customer)
- Browse menu by category: name, price, description, image
- Cart: add/remove, change quantity, live total, survives page refresh
- Place order → show order number
- "My orders": this visit's orders with live status

## Feature 2 — Live kitchen board (Staff)
- Grid of table cards; new order appears within 2 seconds, highlighted
- Change status: Pending → Preparing → Completed; customer view updates

## Feature 3 — Bill & close table (Staff)
- Open a table → itemised bill and total
- "Close table" archives the visit and resets the table for the next diner

## Open questions (to be decided by the Product Owner)
1. Can a customer cancel an order, and up to which status?
2. Can a table be closed while orders are Pending or Preparing?
3. Staff access: none, a PIN, or a login?
4. What happens if an item sells out mid-service?
5. Is the bill one combined total, or listed per order?

## Out of scope
Payments, QR code generation, multi-language, menu management,
past-visit history, notifications, cloud deployment.

## Tech & data
React SPA, Node.js/Express, SQLite, Server-Sent Events.
Seed: 10 tables, 4 categories, 12 menu items.
Runs locally only: one command (`npm install && npm start`) starts
everything, and the app opens at http://localhost:3000.

## Design
High-fidelity mockups are required (no low-fidelity wireframes): styled,
standalone HTML files that open directly in the browser (no Figma), with
an index.html linking all screens. The built app must match them.
Five screens: Menu, Cart, My Orders, Kitchen Board, Table Bill.
