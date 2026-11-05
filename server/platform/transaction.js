/**
 * One database transaction at a time, on SQLite's single writer. Work is
 * synchronous, so nothing can interleave with it: this is what makes "the first
 * change to arrive wins" hold (BR3.3).
 */
export function createTransactions(db, log) {
  let afterCommitQueue = null;

  function runAfterCommit(callbacks) {
    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        // The change is already committed, so the caller's request still succeeded.
        log.error('After-commit step failed', error);
      }
    }
  }

  function runOutermost(work) {
    afterCommitQueue = [];
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      if (typeof result?.then === 'function') {
        throw new Error('withTransaction work must be synchronous');
      }
      db.exec('COMMIT');
      const callbacks = afterCommitQueue;
      afterCommitQueue = null;
      runAfterCommit(callbacks);
      return result;
    } catch (error) {
      afterCommitQueue = null;
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Runs work in one transaction. A nested call joins the transaction already open. */
  function withTransaction(work) {
    return afterCommitQueue ? work() : runOutermost(work);
  }

  /** Queues a step for after the commit; a rollback drops it. Needs an open transaction. */
  function afterCommit(callback) {
    if (!afterCommitQueue) throw new Error('afterCommit needs an open transaction');
    afterCommitQueue.push(callback);
  }

  return { withTransaction, afterCommit };
}
