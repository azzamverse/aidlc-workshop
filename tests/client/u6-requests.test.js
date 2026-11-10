import { describe, expect, it } from 'vitest';
import {
  applyRequestChange,
  boardRequestText,
  dinerButtonText,
  kindsOf,
  newOrderAlert,
  requestsOfTable,
  withoutRequest,
  withoutTable,
} from '../../client/src/features/requests.js';

describe('the diner buttons', () => {
  it('say what they do, and that staff have been told', () => {
    expect(dinerButtonText('waiter', false)).toBe('Call the waiter');
    expect(dinerButtonText('bill', false)).toBe('Ask for the bill');
    expect(dinerButtonText('waiter', true)).toContain('staff told');
    expect(dinerButtonText('bill', true)).toContain('staff told');
  });

  it('follow live changes for one kind only', () => {
    expect(applyRequestChange(['waiter'], { kind: 'bill', status: 'waiting' }).sort()).toEqual(['bill', 'waiter']);
    expect(applyRequestChange(['waiter', 'bill'], { kind: 'waiter', status: 'responded' })).toEqual(['bill']);
  });

  it('a repeat keeps one entry', () => {
    expect(applyRequestChange(['waiter'], { kind: 'waiter', status: 'waiting' })).toEqual(['waiter']);
  });

  it('reads the kinds from a list', () => {
    expect(kindsOf([{ kind: 'bill' }])).toEqual(['bill']);
  });
});

describe('the request strip', () => {
  const requests = [
    { id: 'a', tableId: 4, kind: 'bill' },
    { id: 'b', tableId: 4, kind: 'waiter' },
    { id: 'c', tableId: 5, kind: 'waiter' },
  ];

  it('names each request in words', () => {
    expect(boardRequestText('waiter')).toBe('Waiter called');
    expect(boardRequestText('bill')).toBe('Bill requested');
  });

  it('shows one table\'s requests, waiter first', () => {
    expect(requestsOfTable(requests, 4).map((request) => request.id)).toEqual(['b', 'a']);
    expect(requestsOfTable(requests, 9)).toEqual([]);
  });

  it('Respond clears exactly one', () => {
    expect(withoutRequest(requests, 'b').map((request) => request.id)).toEqual(['a', 'c']);
  });

  it('closing a table clears only its requests', () => {
    expect(withoutTable(requests, 4).map((request) => request.id)).toEqual(['c']);
  });
});

describe('new-order alerts', () => {
  const tables = [{ id: 4, label: 'Table 4' }];
  const order = { id: 'o1', number: 14, tableId: 4 };

  it('names the table and order number', () => {
    expect(newOrderAlert(new Set(), order, tables)).toEqual({ id: 'o1', number: 14, text: 'New order #14 at Table 4' });
  });

  it('a replayed event does not alert twice', () => {
    const seen = new Set();
    newOrderAlert(seen, order, tables);
    expect(newOrderAlert(seen, order, tables)).toBeNull();
  });

  it('still names the table before the board has loaded', () => {
    expect(newOrderAlert(new Set(), order, []).text).toBe('New order #14 at Table 4');
  });
});
