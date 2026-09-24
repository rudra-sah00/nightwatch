/**
 * Server clock estimation for the watch-party relay.
 *
 * ---- THE BUG THIS EXISTS TO KILL ----
 *
 * `SnapshotBuffer` compares timestamps from two different machines' wall clocks.
 * Senders stamp `t = Date.now()` (`use-theatre-network.ts:131,149`) and receivers
 * sample with their own `Date.now()` (`:345`), so the interpolation window is really
 * `INTERP_DELAY_MS ± skew`.
 *
 * That failure is not graceful. For a peer whose clock is more than
 * `INTERP_DELAY_MS` behind, `target >= newest.t` holds on every call, the
 * hold-at-newest branch runs, and there is NO interpolation at all — that avatar steps
 * at the send rate. Consumer clocks drift by seconds, so this is very likely producing
 * a worse artefact today than the network is.
 *
 * The relay fixes the sender half by stamping every batch with one server tick. This
 * module fixes the receiver half, by mapping the local monotonic clock onto server
 * time so both sides of the comparison are in the same frame.
 *
 * ---- WHY NOT `useClockSync` ----
 *
 * `room/hooks/useClockSync.ts` estimates `serverTime - Date.now()` from a one-way
 * message. That quantity is `offset + one-way latency`, not `offset`: there is no RTT
 * probe, so the two are inseparable and the estimate is biased by however long the
 * message took to arrive. A round-trip probe can separate them, which is what this
 * does.
 *
 * @packageDocumentation
 */

/** How many probes to keep. At one probe every 30 s this is ~8 minutes of history. */
export const CLOCK_WINDOW = 16;

/** One completed round-trip probe. */
export interface ClockSample {
  /** Estimated `serverTime - clientMono` offset, ms. */
  offset: number;
  /** Measured round-trip time, ms. */
  rtt: number;
}

/**
 * Maps this machine's monotonic clock onto the relay's clock.
 *
 * Deliberately free of `performance.now()` calls: every time is passed in, so the whole
 * estimator is testable without faking a global. The hook that owns the socket supplies
 * the readings.
 */
export class ServerClock {
  private samples: ClockSample[] = [];
  private offsetMs = 0;
  private calibrated = false;

  /**
   * Record a completed probe.
   *
   * @param sentMono - `performance.now()` when the probe was sent.
   * @param serverTime - The relay's `Date.now()` at the moment it replied.
   * @param receivedMono - `performance.now()` when the reply arrived.
   *
   * @remarks
   * The offset assumes the server stamped its reply midway between our send and our
   * receive, which is the standard NTP assumption and the best available with a single
   * server stamp:
   *
   * ```
   * offset = serverTime - (sentMono + receivedMono) / 2
   * ```
   *
   * A probe with a non-positive or absurd RTT is discarded rather than averaged in — a
   * negative RTT means the monotonic source moved backwards, which should be
   * impossible and must not be allowed to poison the estimate.
   */
  addSample(
    sentMono: number,
    serverTime: number,
    receivedMono: number,
  ): boolean {
    const rtt = receivedMono - sentMono;
    if (!Number.isFinite(rtt) || rtt < 0 || !Number.isFinite(serverTime)) {
      return false;
    }

    const offset = serverTime - (sentMono + receivedMono) / 2;
    this.samples.push({ offset, rtt });
    if (this.samples.length > CLOCK_WINDOW) {
      this.samples.shift();
    }

    this.recompute();
    return true;
  }

  /**
   * Pick the offset to trust.
   *
   * The sample with the LOWEST RTT wins, rather than the median or the mean.
   *
   * Every probe's offset is corrupted by asymmetry between the outbound and return
   * legs, and the size of that corruption is bounded by the RTT — a probe that came
   * back in 40 ms cannot be more than 20 ms wrong, whatever the queuing. So the
   * fastest round trip is the least contaminated estimate available, and averaging it
   * with slower ones only mixes error back in. This is why NTP and every game-network
   * clock sync filters on minimum delay rather than smoothing.
   *
   * The median, which `useClockSync` uses, is the right tool for a different problem:
   * rejecting outliers among samples of EQUAL quality. These samples are not of equal
   * quality and their quality is directly measurable.
   */
  private recompute(): void {
    let best: ClockSample | null = null;
    for (const sample of this.samples) {
      if (!best || sample.rtt < best.rtt) {
        best = sample;
      }
    }
    if (best) {
      this.offsetMs = best.offset;
      this.calibrated = true;
    }
  }

  /** Offset to add to a monotonic reading to get server time, ms. */
  get offset(): number {
    return this.offsetMs;
  }

  /** False until at least one probe has completed. */
  get isCalibrated(): boolean {
    return this.calibrated;
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  /**
   * Server time now, given a monotonic reading.
   *
   * `performance.now()` is the required base, not `Date.now()`. It is monotonic, so an
   * NTP correction or a user changing their system clock mid-party cannot make every
   * remote avatar jump. `Date.now()` would.
   */
  now(monoNow: number): number {
    return monoNow + this.offsetMs;
  }

  /**
   * Round-trip time at a percentile, or null before any probe lands.
   *
   * This is the measurement Stage 0 of the migration plan calls for, and the number the
   * whole latency case rests on: `INTERP_DELAY_MS` should be sized from real jitter
   * rather than guessed, and nothing in the app has ever measured it.
   */
  rttPercentile(percentile: number): number | null {
    if (this.samples.length === 0) {
      return null;
    }
    const sorted = this.samples.map((s) => s.rtt).sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
    );
    return sorted[index];
  }

  /** Lowest RTT seen in the window — the probe the offset was taken from. */
  get bestRtt(): number | null {
    return this.samples.length === 0
      ? null
      : Math.min(...this.samples.map((s) => s.rtt));
  }

  /**
   * Observed jitter, as p99 minus p50 of RTT.
   *
   * This is the figure that should set `INTERP_DELAY_MS`: the buffer has to cover the
   * tail, not the average. It is also the number that decides whether unreliable
   * datagrams are worth pursuing at all — if the tail is modest, a reliable transport
   * costs little.
   */
  get jitter(): number | null {
    const p50 = this.rttPercentile(50);
    const p99 = this.rttPercentile(99);
    return p50 === null || p99 === null ? null : p99 - p50;
  }

  /** Drop every sample. Used when the transport reconnects and RTTs are no longer comparable. */
  reset(): void {
    this.samples = [];
    this.offsetMs = 0;
    this.calibrated = false;
  }
}
