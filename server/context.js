import { createLiveRepo } from './live/repo.js';
import { createLiveService } from './live/service.js';
import { createMenuRepo } from './menu/repo.js';
import { createMenuService } from './menu/service.js';
import { createOrderingRepo } from './ordering/repo.js';
import { createOrderingService } from './ordering/service.js';
import { openDatabase } from './platform/db.js';
import { logger } from './platform/logger.js';
import { createTransactions } from './platform/transaction.js';
import { createStaffService } from './staff/service.js';
import { createTablesRepo } from './tables/repo.js';
import { createTablesService } from './tables/service.js';
import * as featureU6 from './features/u6.js';
import * as featureU7 from './features/u7.js';

/** Contract C10: upgrade and route order is U6, then U7. */
const FEATURES = [featureU6, featureU7];

/**
 * Opens the database and wires every component together.
 * `shared` is contract C4: the server calls U4 builds on.
 */
export function createContext({ dbFile, log = logger, now = Date.now, staffPin = null, features = FEATURES }) {
  const staff = createStaffService({ pin: staffPin, log, now });
  const db = openDatabase(dbFile, { featureSteps: features.flatMap((feature) => feature.migrations()), log });
  const transactions = createTransactions(db, log);
  const menuRepo = createMenuRepo(db);
  const tablesRepo = createTablesRepo(db);
  const orderRepo = createOrderingRepo(db);

  const live = createLiveService({ repo: createLiveRepo(db), transactions, log, now });
  const { publishEvent } = live;
  const menu = createMenuService({ repo: menuRepo, transactions, publishEvent });
  const tables = createTablesService({ repo: tablesRepo, orderRepo, transactions, now });
  const ordering = createOrderingService({
    repo: orderRepo,
    menuRepo,
    tablesRepo,
    tablesService: tables,
    transactions,
    publishEvent,
    now,
  });

  const shared = {
    withTransaction: transactions.withTransaction,
    getCurrentVisit: tables.getCurrentVisit,
    listVisitOrders: tables.listVisitOrders,
    archiveVisit: tables.archiveVisit,
    publishEvent,
  };

  function close() {
    live.stop();
    if (db.isOpen) db.close();
  }

  return { db, log, live, menu, tables, ordering, shared, staff, requireStaff: staff.requireStaff, features, close };
}
