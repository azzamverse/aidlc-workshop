import express from 'express';
import { createBillingService } from './billing/service.js';
import { AppError, toErrorBody, validationFailed } from './platform/errors.js';
import { SESSION_COOKIE } from './staff/service.js';

/** Contract C5. Each address serves the app; the client's router picks the screen. */
export const SCREEN_ROUTES = [
  '/table/:id',
  '/table/:id/cart',
  '/table/:id/orders',
  '/staff',
  '/staff/tables/:id',
];

function registerMenuRoutes(api, { menu, requireStaff }) {
  api.get('/menu', (req, res) => res.json(menu.getMenu()));
  api.put('/menu/items/:itemId/sold-out', requireStaff, (req, res) => {
    res.json(menu.setSoldOut(req.params.itemId, req.body?.soldOut));
  });
}

function registerStaffRoutes(api, { staff, requireStaff }) {
  api.post('/staff/session', (req, res) => {
    const token = staff.signIn(req.body?.pin, req.ip);
    // No expiry date: the cookie ends with the browser (BR1.2).
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/' });
    res.status(204).end();
  });
  api.get('/staff/session', requireStaff, (req, res) => res.status(204).end());
}

function registerTableRoutes(api, { tables, requireStaff }) {
  api.get('/tables', requireStaff, (req, res) => res.json(tables.listBoard()));
  api.get('/tables/:tableId', (req, res) => res.json(tables.openTable(req.params.tableId)));
  api.get('/tables/:tableId/visit', (req, res) => res.json(tables.getVisitForDiner(req.params.tableId)));
  api.get('/tables/:tableId/orders', (req, res) => {
    res.json(tables.listCurrentOrders(req.params.tableId));
  });
}

function registerOrderRoutes(api, { ordering, requireStaff }) {
  api.post('/tables/:tableId/orders', (req, res) => {
    const { order, created } = ordering.placeOrder(req.params.tableId, req.body);
    res.status(created ? 201 : 200).json(order);
  });
  api.post('/tables/:tableId/orders/:orderId/cancel', (req, res) => {
    res.json(ordering.cancelOrder(req.params.tableId, req.params.orderId));
  });
  api.put('/orders/:orderId/status', requireStaff, (req, res) => {
    res.json(ordering.moveOrder(req.params.orderId, req.body));
  });
}

function readLastEventId(req) {
  const raw = req.get('Last-Event-ID');
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

function registerLiveRoutes(api, { live, tables, requireStaff }) {
  // C11: the all-tables stream is staff-only; a stream for one table stays open.
  const staffWithoutTable = (req, res, next) =>
    req.query.tableId === undefined ? requireStaff(req, res, next) : next();
  api.get('/events', staffWithoutTable, (req, res) => {
    const { tableId: rawTableId } = req.query;
    const tableId = rawTableId === undefined ? null : tables.requireTable(rawTableId).id;
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.flushHeaders();
    const close = live.subscribe({
      tableId,
      lastEventId: readLastEventId(req),
      send: (frame) => res.write(frame),
    });
    req.on('close', close);
  });
}

/** BR7.8: lets U2 and U3 test the table-closed reaction before U4 exists. */
function registerTestRoutes(api, { live, tables, staff }) {
  // BR1.7: exists only under test, so specs can start with a clean lockout.
  api.post('/test/staff/reset-lockout', (req, res) => {
    staff.resetLockout();
    res.status(204).end();
  });
  api.post('/test/events', (req, res) => {
    const { type, tableId, visitId } = req.body ?? {};
    if (type !== 'table.closed') throw validationFailed('Only table.closed can be published here.');
    const table = tables.requireTable(tableId);
    const sequence = live.publishEvent({ type, tableId: table.id, visitId: visitId ?? null });
    res.status(201).json({ sequence });
  });
}

function registerScreens(app, distDir) {
  app.use(express.static(distDir, { index: false }));
  app.get('/', (req, res) => res.redirect('/staff'));
  // The root form: an absolute path through a dot-folder (a Bolt's worktree) is refused.
  app.get(SCREEN_ROUTES, (req, res, next) => {
    res.sendFile('index.html', { root: distDir }, (error) => {
      if (error) next(error);
    });
  });
}

function toRefusal(error) {
  if (error instanceof AppError) return error;
  // A malformed or oversized body (body parser sets `type`), or a malformed address.
  if (error.type || error instanceof URIError) return validationFailed('The request is not valid.');
  return null;
}

function createErrorHandler(log) {
  return (error, req, res, next) => {
    if (res.headersSent) {
      log.error('Request failed after the response started', error, { path: req.path });
      next(error);
      return;
    }
    const refusal = toRefusal(error);
    if (refusal) {
      res.status(refusal.status).json(toErrorBody(refusal));
      return;
    }
    log.error('Request failed', error, { method: req.method, path: req.path });
    const failure = { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
    res.status(500).json(toErrorBody(failure));
  };
}

export function createApp(context, { distDir, isTestMode = false }) {
  const app = express();
  app.disable('x-powered-by');
  const api = express.Router();
  // Before the feature modules, so their routes on `app` get parsed bodies too.
  app.use('/api', express.json({ limit: '100kb' }));
  // Contract C10: registered before the API router, whose last step answers 404.
  context.features.forEach((feature) => feature.registerRoutes(app, context));

  registerStaffRoutes(api, context);
  registerMenuRoutes(api, context);
  registerTableRoutes(api, context);
  registerOrderRoutes(api, context);
  registerLiveRoutes(api, context);
  if (isTestMode) registerTestRoutes(api, context);

  // ROUTE SLOT: Billing (U4). U4 registers its C3 routes here, using context.shared,
  // and edits nothing else in this file.
  // >>> BILLING ROUTES START
  const billing = createBillingService({ shared: context.shared, requireTable: context.tables.requireTable });
  api.get('/tables/:tableId/bill', context.requireStaff, (req, res) => res.json(billing.getBill(req.params.tableId)));
  api.post('/tables/:tableId/close', context.requireStaff, (req, res) => res.json(billing.closeTable(req.params.tableId)));
  // <<< BILLING ROUTES END

  api.use(() => {
    throw new AppError(404, 'NOT_FOUND', 'Not found.');
  });

  app.use('/api', api);
  registerScreens(app, distDir);
  app.use(createErrorHandler(context.log));
  return app;
}
