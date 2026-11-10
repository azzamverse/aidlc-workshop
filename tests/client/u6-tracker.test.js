import { describe, expect, it } from 'vitest';
import { estimateText, filledSteps, withKnownEstimate } from '../../client/src/features/tracker.js';

describe('the tracker bar', () => {
  it.each([['Pending', 1], ['Preparing', 2], ['Completed', 3]])('%s fills %i of 3', (status, filled) => {
    expect(filledSteps(status)).toBe(filled);
  });

  it('Cancelled has no bar', () => {
    expect(filledSteps('Cancelled')).toBeNull();
  });
});

describe('the estimate', () => {
  it('reads About N min on an open order', () => {
    expect(estimateText({ status: 'Pending', estimateMinutes: 16 })).toBe('About 16 min');
    expect(estimateText({ status: 'Preparing', estimateMinutes: 10 })).toBe('About 10 min');
  });

  it('a Completed order shows none, even if one is left on it', () => {
    expect(estimateText({ status: 'Completed', estimateMinutes: 16 })).toBeNull();
  });

  it('shows none until one is known', () => {
    expect(estimateText({ status: 'Pending' })).toBeNull();
  });

  it('an open order keeps its last estimate until the re-read', () => {
    const current = [{ id: 'a', status: 'Pending', estimateMinutes: 13 }];
    expect(withKnownEstimate(current, { id: 'a', status: 'Preparing' }).estimateMinutes).toBe(13);
  });

  it('a finished or unknown order gets none, and an empty list is safe', () => {
    const current = [{ id: 'a', status: 'Preparing', estimateMinutes: 13 }];
    expect(withKnownEstimate(current, { id: 'a', status: 'Completed' })).not.toHaveProperty('estimateMinutes');
    expect(withKnownEstimate(null, { id: 'b', status: 'Pending' })).toEqual({ id: 'b', status: 'Pending' });
  });
});
