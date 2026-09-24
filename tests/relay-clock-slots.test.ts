import { describe, expect, it } from 'vitest';
import {
  CLOCK_WINDOW,
  ServerClock,
} from '../src/features/watch-party/relay/lib/clock';
import { SlotTable } from '../src/features/watch-party/relay/lib/slots';
import type { RosterEntry } from '../src/features/watch-party/relay/lib/types';

describe('ServerClock — offset estimation', () => {
  it('is uncalibrated until the first probe lands', () => {
    const clock = new ServerClock();
    expect(clock.isCalibrated).toBe(false);
    expect(clock.offset).toBe(0);
    expect(clock.rttPercentile(50)).toBeNull();
  });

  it('derives the offset from a symmetric round trip', () => {
    const clock = new ServerClock();
    // Sent at mono 1000, reply seen at mono 1100 → 100 ms RTT. The server stamped
    // 50 ms in, when our mono read 1050, and said its clock was 500000.
    clock.addSample(1000, 500_000, 1100);
    expect(clock.isCalibrated).toBe(true);
    expect(clock.offset).toBeCloseTo(500_000 - 1050, 6);
    // So server time at mono 1050 is exactly what the server said.
    expect(clock.now(1050)).toBeCloseTo(500_000, 6);
  });

  it('converts a monotonic reading into server time', () => {
    const clock = new ServerClock();
    clock.addSample(0, 1_000_000, 100);
    // offset = 1_000_000 - 50
    expect(clock.now(50)).toBeCloseTo(1_000_000, 6);
    expect(clock.now(1050)).toBeCloseTo(1_001_000, 6);
  });

  /*
    The filtering rule is the substance of this class, so it gets the most tests.

    Every probe's offset is wrong by at most half its RTT, because that is the bound on
    how asymmetric the two legs can be. The fastest round trip is therefore the least
    contaminated sample available, and averaging it with slower ones mixes error back
    in. `useClockSync` takes a median, which is the right tool for outliers among
    samples of EQUAL quality — these samples have directly measurable, unequal quality.
  */
  it('prefers the lowest-RTT probe over later, slower ones', () => {
    const clock = new ServerClock();
    // A fast, trustworthy probe: true offset is 1000.
    clock.addSample(0, 1000 + 5, 10);
    const goodOffset = clock.offset;

    // Then a badly queued probe whose apparent offset is far off.
    clock.addSample(100, 1000 + 400, 900);

    expect(clock.offset).toBeCloseTo(goodOffset, 6);
  });

  it('adopts a faster probe when one arrives', () => {
    const clock = new ServerClock();
    clock.addSample(0, 5000, 500); // 500 ms RTT
    const slow = clock.offset;
    clock.addSample(1000, 6000, 1020); // 20 ms RTT — much better
    expect(clock.offset).not.toBeCloseTo(slow, 6);
    expect(clock.bestRtt).toBeCloseTo(20, 6);
  });

  it('beats a median filter on a tail-heavy sample set', () => {
    // One fast probe and four slow ones. A median would land on a slow sample and
    // inherit its asymmetry; minimum-RTT lands on the good one.
    const clock = new ServerClock();
    const trueOffset = 10_000;
    // Fast probe, perfectly symmetric.
    clock.addSample(0, trueOffset + 10, 20);
    // Four slow probes, each delayed on the RETURN leg, so their apparent offset is
    // biased high by the asymmetry.
    for (let i = 1; i <= 4; i += 1) {
      const sent = i * 1000;
      const received = sent + 400;
      clock.addSample(sent, trueOffset + sent + 380, received);
    }
    // Within a millisecond of truth, despite 80% of samples being bad.
    expect(Math.abs(clock.offset - trueOffset)).toBeLessThan(1);
  });

  it('rejects a probe whose monotonic clock went backwards', () => {
    const clock = new ServerClock();
    // Impossible, and must not be allowed to poison the estimate.
    expect(clock.addSample(1000, 5000, 900)).toBe(false);
    expect(clock.isCalibrated).toBe(false);
  });

  it('rejects a non-finite server time', () => {
    const clock = new ServerClock();
    expect(clock.addSample(0, Number.NaN, 10)).toBe(false);
    expect(clock.addSample(0, Number.POSITIVE_INFINITY, 10)).toBe(false);
    expect(clock.sampleCount).toBe(0);
  });

  it('accepts a zero-RTT probe, which a loopback test really produces', () => {
    const clock = new ServerClock();
    expect(clock.addSample(500, 9000, 500)).toBe(true);
    expect(clock.offset).toBeCloseTo(9000 - 500, 6);
  });
});

describe('ServerClock — window and jitter', () => {
  it('keeps at most CLOCK_WINDOW samples', () => {
    const clock = new ServerClock();
    for (let i = 0; i < CLOCK_WINDOW + 10; i += 1) {
      clock.addSample(i * 100, 1000 + i * 100, i * 100 + 50);
    }
    expect(clock.sampleCount).toBe(CLOCK_WINDOW);
  });

  it('reports RTT percentiles, the number Stage 0 exists to collect', () => {
    const clock = new ServerClock();
    // RTTs of 10..100 in steps of 10.
    for (let i = 1; i <= 10; i += 1) {
      const sent = i * 10_000;
      clock.addSample(sent, 500_000, sent + i * 10);
    }
    expect(clock.rttPercentile(50)).toBeCloseTo(50, 6);
    expect(clock.rttPercentile(100)).toBeCloseTo(100, 6);
    expect(clock.bestRtt).toBeCloseTo(10, 6);
  });

  it('computes jitter as p99 minus p50, which is what sizes the buffer', () => {
    const clock = new ServerClock();
    for (let i = 1; i <= 10; i += 1) {
      const sent = i * 10_000;
      clock.addSample(sent, 500_000, sent + i * 10);
    }
    // The interpolation buffer must cover the TAIL, not the average.
    const jitter = clock.jitter;
    expect(jitter).not.toBeNull();
    expect(jitter as number).toBeGreaterThan(0);
  });

  it('forgets everything on reset, since RTTs across a reconnect are not comparable', () => {
    const clock = new ServerClock();
    clock.addSample(0, 1000, 10);
    clock.reset();
    expect(clock.isCalibrated).toBe(false);
    expect(clock.sampleCount).toBe(0);
    expect(clock.jitter).toBeNull();
  });
});

const entry = (
  slot: number,
  userId: string,
  character?: 'm' | 'w',
): RosterEntry => ({
  slot,
  userId,
  userName: userId.toUpperCase(),
  character,
});

describe('SlotTable', () => {
  it('rejects every batch before a roster arrives', () => {
    const table = new SlotTable();
    // Generation 0 is a legitimate value, so "no roster yet" cannot be 0.
    expect(table.accepts(0)).toBe(false);
  });

  it('binds slots to users from the roster', () => {
    const table = new SlotTable();
    table.apply(3, [entry(0, 'alice'), entry(2, 'bob')]);
    expect(table.userIdFor(0)).toBe('alice');
    expect(table.userIdFor(2)).toBe('bob');
    // Slot 1 is genuinely unoccupied, not merely unknown.
    expect(table.userIdFor(1)).toBeNull();
    expect(table.slotFor('bob')).toBe(2);
  });

  it('accepts a batch stamped with the current generation and rejects any other', () => {
    const table = new SlotTable();
    table.apply(7, [entry(0, 'alice')]);
    expect(table.accepts(7)).toBe(true);
    expect(table.accepts(6)).toBe(false);
    expect(table.accepts(8)).toBe(false);
  });

  it('never resolves a slot against a stale roster', () => {
    const table = new SlotTable();
    table.apply(1, [entry(0, 'alice')]);
    // Alice leaves, Carol takes slot 0.
    table.apply(2, [entry(0, 'carol')]);
    // A batch still in flight from generation 1 must be discarded, not applied — doing
    // so would draw Carol's pose onto Alice.
    expect(table.accepts(1)).toBe(false);
    expect(table.userIdFor(0)).toBe('carol');
  });

  it('replaces the table wholesale rather than merging', () => {
    const table = new SlotTable();
    table.apply(1, [entry(0, 'alice'), entry(1, 'bob')]);
    table.apply(2, [entry(0, 'alice')]);
    expect(table.size).toBe(1);
    expect(table.slotFor('bob')).toBeNull();
  });

  it('orders the roster by slot, so every client renders the same list', () => {
    const table = new SlotTable();
    table.apply(1, [entry(2, 'c'), entry(0, 'a'), entry(1, 'b')]);
    expect(table.roster().map((r) => r.userId)).toEqual(['a', 'b', 'c']);
  });

  it('excludes the local user from the peer set', () => {
    const table = new SlotTable();
    table.apply(1, [entry(0, 'me'), entry(1, 'you'), entry(2, 'them')]);
    expect(table.peerIds('me')).toEqual(['you', 'them']);
  });

  it('reads the avatar body from the roster, where no dead band can swallow it', () => {
    const table = new SlotTable();
    table.apply(1, [entry(0, 'alice', 'w'), entry(1, 'bob')]);
    expect(table.characterFor('alice')).toBe('w');
    // Unknown rather than assumed: callers fall back to a hash of the id.
    expect(table.characterFor('bob')).toBeNull();
    expect(table.characterFor('nobody')).toBeNull();
  });

  it('rejects batches again after a reset', () => {
    const table = new SlotTable();
    table.apply(5, [entry(0, 'alice')]);
    table.reset();
    expect(table.accepts(5)).toBe(false);
    expect(table.size).toBe(0);
  });
});
