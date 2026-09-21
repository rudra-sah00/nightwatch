/**
 * Asset download engine for the 3D theatre.
 *
 * Deliberately free of React so the retry, byte-accounting and cancellation
 * rules can be tested directly instead of through a rendered component. The
 * hook in `use-theatre-preload.ts` is a thin wrapper that pipes these callbacks
 * into the view store.
 *
 * The theatre is ~38 MB across five files. That is large enough that a single
 * dropped connection part-way through used to throw away everything already
 * downloaded, so the rules here are:
 *
 *  - Retries are PER ASSET, not per batch. One flaky 16 MB room download must
 *    not restart the four files that already succeeded.
 *  - Bytes are counted per URL, so retrying an asset rewinds only its own
 *    contribution. Counting a single running total would let a retry add a
 *    partial download twice and push the bar past 100%.
 *  - A deliberate cancel is not a failure. Aborting is how the caller unmounts,
 *    so `AbortError` is rethrown immediately and never retried or reported.
 *  - Completed URLs are returned to the caller so a later retry can resume
 *    rather than re-fetch.
 */

/** Retry policy. Four attempts over ~11 s of backoff before giving up. */
export const DOWNLOAD_RETRY = {
  MAX_ATTEMPTS: 4,
  BASE_DELAY_MS: 600,
  MAX_DELAY_MS: 8000,
  /** Fraction of the delay added as random jitter. */
  JITTER: 0.25,
} as const;

/** How often progress may be reported, in ms. */
export const PROGRESS_THROTTLE_MS = 80;

export interface DownloadProgress {
  /** Bytes on the machine so far, summed across assets. */
  receivedBytes: number;
  /** Total expected bytes. 0 when no server advertised a content-length. */
  totalBytes: number;
  /** Assets fully downloaded. */
  filesDone: number;
  /** Assets in this batch. */
  fileCount: number;
  /** 0..1. Byte-accurate when totals are known, file-count based otherwise. */
  fraction: number;
}

/** Carries the URL that actually failed, which a bare fetch error does not. */
export class AssetDownloadError extends Error {
  readonly url: string;

  constructor(url: string, cause?: unknown) {
    super(`Failed to download ${url}`);
    this.name = 'AssetDownloadError';
    this.url = url;
    this.cause = cause;
  }
}

export interface DownloadDeps {
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected for tests so backoff does not really wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected for tests to make jitter deterministic. */
  random?: () => number;
}

export interface DownloadAllOptions extends DownloadDeps {
  urls: readonly string[];
  signal: AbortSignal;
  onProgress: (progress: DownloadProgress) => void;
  /** Called when an asset is about to be retried, with the upcoming attempt. */
  onRetry?: (url: string, attempt: number) => void;
  /** URLs already downloaded by an earlier attempt. Skipped, not re-fetched. */
  completed?: ReadonlySet<string>;
}

export interface DownloadAllResult {
  /** Every URL now on the machine, including ones passed in as completed. */
  completed: Set<string>;
}

/**
 * Exponential backoff with jitter.
 *
 * Jitter matters even for a single client: all five assets fail together when
 * the connection drops, so without it they would retry in lockstep and hit the
 * network as one burst every time.
 */
export function backoffDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const exponential =
    DOWNLOAD_RETRY.BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(exponential, DOWNLOAD_RETRY.MAX_DELAY_MS);
  return Math.round(capped * (1 + random() * DOWNLOAD_RETRY.JITTER));
}

/**
 * Is this a deliberate cancellation rather than a failure?
 *
 * Checked by name as well as by `DOMException`, because the abort reason that
 * surfaces differs between browsers, undici and the jsdom test environment.
 */
export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return err instanceof Error && err.name === 'AbortError';
}

/** Short, user-facing reason. Never leaks a URL or a stack into the UI. */
export function describeDownloadError(err: unknown): string {
  if (isAbortError(err)) return 'Cancelled';
  const cause = err instanceof AssetDownloadError ? err.cause : err;
  if (cause instanceof Error) {
    // A fetch rejection with no status is almost always connectivity.
    if (cause.name === 'TypeError') return 'Network unavailable';
    if (cause.message) return cause.message.slice(0, 120);
  }
  return 'Download failed';
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Ask each server how big its asset is, so the bar has a denominator.
 *
 * HEAD failures are not fatal: a missing size only costs the byte-accurate
 * readout, and the caller falls back to counting files. A size of 0 here is
 * later filled in from the GET response's own content-length.
 */
export async function probeSizes(
  urls: readonly string[],
  signal: AbortSignal,
  deps: DownloadDeps = {},
): Promise<Map<string, number>> {
  const doFetch = deps.fetchImpl ?? fetch;
  const sizes = new Map<string, number>();

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await doFetch(url, { method: 'HEAD', signal });
        const len = Number(res.headers.get('content-length'));
        sizes.set(url, Number.isFinite(len) && len > 0 ? len : 0);
      } catch {
        // Deliberately swallowed — see doc comment. An aborted probe is
        // indistinguishable here from an unsupported HEAD, and both are
        // recoverable by falling back to file-count progress.
        sizes.set(url, 0);
      }
    }),
  );

  return sizes;
}

/**
 * Download every asset, streaming byte counts as they arrive.
 *
 * Resolves only when all of them are on the machine. Throws
 * `AssetDownloadError` if one exhausts its retries, or rethrows `AbortError`
 * the moment the caller cancels.
 */
export async function downloadAll(
  options: DownloadAllOptions,
): Promise<DownloadAllResult> {
  const { urls, signal, onProgress, onRetry } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = options.random ?? Math.random;

  const completed = new Set<string>(options.completed ?? []);
  const pending = urls.filter((u) => !completed.has(u));

  const sizes = await probeSizes(pending, signal, options);
  if (signal.aborted) throw abortError();

  /** Per-URL byte counters, so a retry rewinds only its own asset. */
  const received = new Map<string, number>();
  for (const url of pending) received.set(url, 0);

  let lastReport = 0;

  const report = (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastReport < PROGRESS_THROTTLE_MS) return;
    lastReport = now;

    let receivedBytes = 0;
    for (const value of received.values()) receivedBytes += value;

    let totalBytes = 0;
    for (const value of sizes.values()) totalBytes += value;

    const filesDone = pending.filter((u) => completed.has(u)).length;
    const fraction =
      totalBytes > 0
        ? Math.min(1, receivedBytes / totalBytes)
        : pending.length > 0
          ? filesDone / pending.length
          : 1;

    onProgress({
      receivedBytes,
      totalBytes,
      filesDone: filesDone + (urls.length - pending.length),
      fileCount: urls.length,
      fraction,
    });
  };

  async function stream(url: string): Promise<void> {
    const res = await doFetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // Fill in a size the HEAD probe could not get, so the denominator is right
    // even where HEAD is unsupported.
    if (!sizes.get(url)) {
      const len = Number(res.headers.get('content-length'));
      if (Number.isFinite(len) && len > 0) sizes.set(url, len);
    }

    const body = res.body;
    if (!body) {
      // No streaming available: one jump at the end is the best we can do.
      const buf = await res.arrayBuffer();
      received.set(url, buf.byteLength);
      report(true);
      return;
    }

    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received.set(url, (received.get(url) ?? 0) + value.byteLength);
          report(false);
        }
      }
    } finally {
      // Releasing matters on the abort path, where the loop exits by throwing
      // and the body would otherwise stay locked.
      reader.releaseLock();
    }
  }

  async function withRetry(url: string): Promise<void> {
    let lastErr: unknown;

    for (
      let attempt = 1;
      attempt <= DOWNLOAD_RETRY.MAX_ATTEMPTS;
      attempt += 1
    ) {
      if (signal.aborted) throw abortError();
      try {
        // Rewind this asset's counter so a partial first try is not counted
        // twice once the retry streams the same bytes again.
        received.set(url, 0);
        report(false);
        await stream(url);
        completed.add(url);
        report(true);
        return;
      } catch (err) {
        if (isAbortError(err)) throw err;
        lastErr = err;
        if (attempt === DOWNLOAD_RETRY.MAX_ATTEMPTS) break;
        onRetry?.(url, attempt + 1);
        await sleep(backoffDelay(attempt, random));
      }
    }

    throw new AssetDownloadError(url, lastErr);
  }

  report(true);
  await Promise.all(pending.map(withRetry));
  report(true);

  return { completed };
}
