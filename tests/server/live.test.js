import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEEP_ALIVE_MS } from '../../server/live/service.js';
import { createTestContext } from './context-helper.js';

const HOUR_MS = 60 * 60 * 1000;
const START = Date.parse('2026-01-01T10:00:00.000Z');

describe('live updates', () => {
  let context;
  let clock;

  const publish = (tableId = 5) => context.shared.publishEvent({ type: 'table.closed', tableId, visitId: 'v' });
  const listen = (options = {}) => {
    const frames = [];
    const close = context.live.subscribe({ ...options, send: (frame) => frames.push(frame) });
    return { frames, close };
  };

  beforeEach(() => {
    clock = START;
    context = createTestContext({ now: () => clock });
  });

  afterEach(() => {
    vi.useRealTimers();
    context.cleanup();
  });

  it('tells a new stream the latest sequence, without an event', () => {
    publish();
    const { frames } = listen();
    expect(frames).toEqual(['id: 1\n\n']);
  });

  it('frames an event with its sequence as the SSE id and in its data', () => {
    const { frames } = listen();
    publish(5);
    expect(frames[1]).toBe(
      'id: 1\nevent: table.closed\ndata: {"sequence":1,"tableId":5,"visitId":"v"}\n\n',
    );
  });

  it('a table stream carries its events and those with no table only', () => {
    const { frames } = listen({ tableId: 5 });
    publish(5);
    publish(2);
    context.menu.setSoldOut('coffee', true);
    expect(frames.slice(1).map((frame) => frame.split('\n')[0])).toEqual(['id: 1', 'id: 3']);
  });

  it('a stream with no table carries everything', () => {
    const { frames } = listen();
    publish(5);
    publish(2);
    expect(frames).toHaveLength(3);
  });

  it('sends nothing to a closed stream', () => {
    const { frames, close } = listen();
    close();
    publish();
    expect(frames).toHaveLength(1);
  });

  it('replays only what was missed after Last-Event-ID', () => {
    publish();
    publish();
    publish();
    const { frames } = listen({ lastEventId: 1 });
    expect(frames.map((frame) => frame.split('\n')[0])).toEqual(['id: 2', 'id: 3']);
  });

  it('replays nothing when the stream is up to date', () => {
    publish();
    expect(listen({ lastEventId: 1 }).frames).toEqual([]);
  });

  it('applies the table filter to a replay', () => {
    publish(5);
    publish(2);
    const { frames } = listen({ lastEventId: 0, tableId: 5 });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain('id: 1');
  });

  it('sends resync when the missed events have been pruned', () => {
    publish();
    publish();
    clock += 2 * HOUR_MS;
    expect(context.live.pruneOldEvents()).toBe(2);
    const { frames } = listen({ lastEventId: 1 });
    expect(frames).toEqual(['id: 2\nevent: resync\ndata: {"sequence":2}\n\n']);
  });

  it('sends resync when the missed events are over an hour old but not pruned yet', () => {
    publish();
    publish();
    clock += HOUR_MS + 1;
    expect(listen({ lastEventId: 1 }).frames[0]).toContain('event: resync');
  });

  it('still replays events just inside the hour', () => {
    publish();
    publish();
    clock += HOUR_MS - 1;
    expect(listen({ lastEventId: 1 }).frames[0]).toContain('id: 2');
  });

  it('sends resync for an id from another database', () => {
    publish();
    expect(listen({ lastEventId: 50 }).frames[0]).toContain('event: resync');
  });

  it('prunes only events older than one hour', () => {
    publish();
    clock += 2 * HOUR_MS;
    publish();
    expect(context.live.pruneOldEvents()).toBe(1);
    expect(listen({ lastEventId: 1 }).frames[0]).toContain('id: 2');
  });

  it('keep-alive reaches every stream as an SSE comment', () => {
    const first = listen();
    const second = listen({ tableId: 5 });
    context.live.sendKeepAlive();
    expect(first.frames.at(-1)).toBe(': keep-alive\n\n');
    expect(second.frames.at(-1)).toBe(': keep-alive\n\n');
  });

  it('start sends a keep-alive every 25 seconds and prunes straight away', () => {
    vi.useFakeTimers();
    publish();
    clock += 2 * HOUR_MS;
    context.live.start();
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM live_events').get().count).toBe(0);
    const { frames } = listen();
    vi.advanceTimersByTime(KEEP_ALIVE_MS);
    expect(frames.at(-1)).toBe(': keep-alive\n\n');
    context.live.stop();
  });

  it('a stream that fails to write is dropped and logged; others still receive', () => {
    context.live.subscribe({
      send: (frame) => {
        if (frame.startsWith('id: 1\nevent')) throw new Error('closed');
      },
    });
    const healthy = listen();
    publish();
    expect(context.log.errors).toHaveLength(1);
    expect(healthy.frames).toHaveLength(2);
    publish();
    expect(context.log.errors).toHaveLength(1);
  });

  it('an event in a rolled-back transaction is neither sent nor stored', () => {
    const { frames } = listen();
    expect(() =>
      context.shared.withTransaction(() => {
        publish();
        throw new Error('stop');
      }),
    ).toThrow('stop');
    expect(frames).toHaveLength(1);
    expect(listen({ lastEventId: 0 }).frames).toEqual([]);
  });

  it('an event in a transaction is sent only after the commit', () => {
    const { frames } = listen();
    context.shared.withTransaction(() => {
      publish();
      expect(frames).toHaveLength(1);
    });
    expect(frames).toHaveLength(2);
  });
});
