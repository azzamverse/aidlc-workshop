import { randomUUID } from 'node:crypto';
import { AppError, tableNotFound } from '../platform/errors.js';

/** Turns an address value into a table id: digits only, so "5.5" or "5abc" are not tables. */
function parseTableId(rawId) {
  return /^[1-9]\d*$/.test(String(rawId)) ? Number(rawId) : null;
}

export function createTablesService({ repo, orderRepo, transactions, now = Date.now }) {
  const instant = () => new Date(now()).toISOString();

  /** The table for an address value, or a TABLE_NOT_FOUND refusal. */
  function requireTable(rawId) {
    const tableId = parseTableId(rawId);
    const table = tableId === null ? null : repo.findTable(tableId);
    if (!table) throw tableNotFound();
    return table;
  }

  /** A diner screen opened the table: starts a visit when it has none (BR4.1). */
  function openTable(rawId) {
    const table = requireTable(rawId);
    return transactions.withTransaction(() => {
      let visit = repo.findOpenVisit(table.id);
      if (!visit) {
        visit = { id: randomUUID() };
        repo.insertVisit({ id: visit.id, tableId: table.id, startedAt: instant() });
      }
      return { id: table.id, label: table.label, visitId: visit.id };
    });
  }

  /** C4: the table's Open visit, or null, without starting one. */
  function getCurrentVisit(tableId) {
    return repo.findOpenVisit(tableId);
  }

  /** C4: the Orders of a visit, newest first. */
  function listVisitOrders(visitId) {
    return orderRepo.listByVisit(visitId);
  }

  /** The current visit's orders; a table with no visit has none (BR4.2). */
  function listCurrentOrders(rawId) {
    const table = requireTable(rawId);
    const visit = repo.findOpenVisit(table.id);
    return { orders: visit ? orderRepo.listByVisit(visit.id) : [] };
  }

  /** The board read: all tables, and it never starts a visit (BR4.3). */
  function listBoard() {
    const tables = repo.listTables().map((table) => {
      const visit = repo.findOpenVisit(table.id);
      return {
        id: table.id,
        label: table.label,
        visitId: visit?.id ?? null,
        orders: visit ? orderRepo.listByVisit(visit.id) : [],
      };
    });
    return { tables };
  }

  /** C4: closes an open visit, joining the caller's transaction (BR4.4). */
  function archiveVisit(visitId) {
    return transactions.withTransaction(() => {
      if (!repo.closeVisit(visitId, instant())) {
        throw new AppError(409, 'VISIT_NOT_OPEN', 'This visit is not open.');
      }
    });
  }

  return { requireTable, openTable, getCurrentVisit, listVisitOrders, listCurrentOrders, listBoard, archiveVisit };
}
