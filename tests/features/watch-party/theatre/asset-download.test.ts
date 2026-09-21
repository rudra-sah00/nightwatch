import { describe, expect, it, vi } from 'vitest';
import {
  AssetDownloadError,
  backoffDelay,
  DOWNLOAD_RETRY,
  describeDownloadError,
  downloadAll,
  isAbortError,
  probeSizes,
} from '@/features/watch-party/theatre/lib/asset-download';

/** Never really wait, or the retry tests would take ~11 s each. */
const sleep = () => Promise.resolve();
/** Kill jitter so delays are exact. */
const random = () => 0;

/** A Response whose body streams `chunks` and reports a content-length. */
function streamResponse(chunks: Uint8Array[], status = 200): Response {
  const total = chunks.reduce((a, c) => a + c.byteLength, 0);
  let i = 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-length': String(total) }),
    body: {
      getReader: () => ({
        read: () =>
          Promise.resolve(
            i < chunks.length
              ? { done: false, value: chunks[i++] }
              : { done: true, value: undefined },
          ),
        releaseLock: () => {},
      }),
    },
  } as unknown as Response;
}

/** A Response with no streaming body, exercising the arrayBuffer fallback. */
function bufferResponse(size: number): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-length': String(size) }),
    body: null,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
  } as unknown as Response;
}

function headResponse(size: number): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(size > 0 ? { 'content-length': String(size) } : {}),
  } as unknown as Response;
}

const chunk = (n: number) => new Uint8Array(n);

describe('backoffDelay', () => {
  it('grows exponentially from the base delay', () => {
    expect(backoffDelay(1, random)).toBe(DOWNLOAD_RETRY.BASE_DELAY_MS);
    expect(backoffDelay(2, random)).toBe(DOWNLOAD_RETRY.BASE_DELAY_MS * 2);
    expect(backoffDelay(3, random)).toBe(DOWNLOAD_RETRY.BASE_DELAY_MS * 4);
  });

  it('never exceeds the cap however many attempts have passed', () => {
    for (const attempt of [5, 10, 50, 1000]) {
      expect(backoffDelay(attempt, random)).toBeLessThanOrEqual(
        Math.round(DOWNLOAD_RETRY.MAX_DELAY_MS * (1 + DOWNLOAD_RETRY.JITTER)),
      );
    }
  });

  it('adds jitter so simultaneous failures do not retry in lockstep', () => {
    const none = backoffDelay(2, () => 0);
    const full = backoffDelay(2, () => 1);
    expect(full).toBeGreaterThan(none);
  });
});

describe('isAbortError', () => {
  it('recognises a DOMException abort', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
  });

  it('recognises an Error named AbortError, as undici and jsdom produce', () => {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  it('does not mistake a real failure for a cancellation', () => {
    expect(isAbortError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isAbortError(new Error('HTTP 503'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('describeDownloadError', () => {
  it('reports connectivity for a bare fetch rejection', () => {
    const wrapped = new AssetDownloadError('/room.glb', new TypeError('fetch'));
    expect(describeDownloadError(wrapped)).toBe('Network unavailable');
  });

  it('surfaces an HTTP status', () => {
    const wrapped = new AssetDownloadError('/room.glb', new Error('HTTP 503'));
    expect(describeDownloadError(wrapped)).toBe('HTTP 503');
  });

  it('never leaks the URL into the user-facing message', () => {
    const wrapped = new AssetDownloadError(
      'https://assets.example.com/secret/room.glb',
      new Error('HTTP 403'),
    );
    expect(describeDownloadError(wrapped)).not.toContain('assets.example.com');
  });
});

describe('probeSizes', () => {
  it('treats an unavailable HEAD as an unknown size rather than failing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('HEAD not allowed'));
    const sizes = await probeSizes(['/a.glb'], new AbortController().signal, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(sizes.get('/a.glb')).toBe(0);
  });
});

describe('downloadAll', () => {
  it('reports byte-accurate progress and completes', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'HEAD'
          ? headResponse(100)
          : streamResponse([chunk(40), chunk(60)]),
      ),
    );

    const seen: number[] = [];
    const res = await downloadAll({
      urls: ['/a.glb', '/b.glb'],
      signal: new AbortController().signal,
      onProgress: (p) => seen.push(p.receivedBytes),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(res.completed.size).toBe(2);
    expect(seen.at(-1)).toBe(200); // 2 files x 100 bytes
  });

  it('never reports a fraction above 1', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        // Server under-reports: 50 advertised, 100 delivered.
        init?.method === 'HEAD'
          ? headResponse(50)
          : streamResponse([chunk(100)]),
      ),
    );

    const fractions: number[] = [];
    await downloadAll({
      urls: ['/a.glb'],
      signal: new AbortController().signal,
      onProgress: (p) => fractions.push(p.fraction),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(Math.max(...fractions)).toBeLessThanOrEqual(1);
  });

  it('retries a failing asset and succeeds', async () => {
    let getAttempts = 0;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return Promise.resolve(headResponse(10));
      getAttempts += 1;
      if (getAttempts < 3)
        return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(streamResponse([chunk(10)]));
    });

    const retries: number[] = [];
    const res = await downloadAll({
      urls: ['/a.glb'],
      signal: new AbortController().signal,
      onProgress: () => {},
      onRetry: (_u, attempt) => retries.push(attempt),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(getAttempts).toBe(3);
    expect(retries).toEqual([2, 3]);
    expect(res.completed.has('/a.glb')).toBe(true);
  });

  it('gives up after MAX_ATTEMPTS and names the failing asset', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === 'HEAD'
        ? Promise.resolve(headResponse(10))
        : Promise.reject(new TypeError('Failed to fetch')),
    );

    let thrown: unknown;
    try {
      await downloadAll({
        urls: ['/room.glb'],
        signal: new AbortController().signal,
        onProgress: () => {},
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep,
        random,
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(AssetDownloadError);
    expect((thrown as AssetDownloadError).url).toBe('/room.glb');
    // one HEAD + MAX_ATTEMPTS GETs
    expect(fetchImpl).toHaveBeenCalledTimes(1 + DOWNLOAD_RETRY.MAX_ATTEMPTS);
  });

  it('does not double-count bytes when an asset is retried part-way through', async () => {
    let getAttempts = 0;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return Promise.resolve(headResponse(100));
      getAttempts += 1;
      if (getAttempts === 1) {
        // Deliver 60 of 100 bytes, then die.
        let first = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-length': '100' }),
          body: {
            getReader: () => ({
              read: () => {
                if (first) {
                  first = false;
                  return Promise.resolve({ done: false, value: chunk(60) });
                }
                return Promise.reject(new TypeError('connection reset'));
              },
              releaseLock: () => {},
            }),
          },
        } as unknown as Response);
      }
      return Promise.resolve(streamResponse([chunk(100)]));
    });

    const seen: number[] = [];
    await downloadAll({
      urls: ['/a.glb'],
      signal: new AbortController().signal,
      onProgress: (p) => seen.push(p.receivedBytes),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    // The partial 60 must be discarded, not added to the retry's 100.
    expect(seen.at(-1)).toBe(100);
    expect(Math.max(...seen)).toBe(100);
  });

  it('resumes rather than re-downloading assets already completed', async () => {
    const requested: string[] = [];
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method !== 'HEAD') requested.push(url);
      return Promise.resolve(
        init?.method === 'HEAD'
          ? headResponse(10)
          : streamResponse([chunk(10)]),
      );
    });

    const res = await downloadAll({
      urls: ['/a.glb', '/b.glb', '/c.glb'],
      signal: new AbortController().signal,
      completed: new Set(['/a.glb', '/b.glb']),
      onProgress: () => {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(requested).toEqual(['/c.glb']);
    // The returned set still describes the full batch.
    expect(res.completed.size).toBe(3);
  });

  it('counts already-completed files in filesDone so the bar does not rewind', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'HEAD'
          ? headResponse(10)
          : streamResponse([chunk(10)]),
      ),
    );

    const progress: { filesDone: number; fileCount: number }[] = [];
    await downloadAll({
      urls: ['/a.glb', '/b.glb', '/c.glb'],
      signal: new AbortController().signal,
      completed: new Set(['/a.glb', '/b.glb']),
      onProgress: (p) =>
        progress.push({ filesDone: p.filesDone, fileCount: p.fileCount }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(progress.at(-1)).toEqual({ filesDone: 3, fileCount: 3 });
  });

  it('aborts immediately without retrying', async () => {
    const controller = new AbortController();
    let getCalls = 0;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return Promise.resolve(headResponse(10));
      getCalls += 1;
      const err = new Error('Aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    let thrown: unknown;
    try {
      await downloadAll({
        urls: ['/a.glb'],
        signal: controller.signal,
        onProgress: () => {},
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep,
        random,
      });
    } catch (err) {
      thrown = err;
    }

    expect(isAbortError(thrown)).toBe(true);
    expect(getCalls).toBe(1); // no retry on a deliberate cancel
  });

  it('falls back to file-count progress when no size is advertised', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'HEAD'
          ? headResponse(0)
          : ({
              ok: true,
              status: 200,
              headers: new Headers(),
              body: {
                getReader: () => {
                  let sent = false;
                  return {
                    read: () => {
                      if (sent)
                        return Promise.resolve({
                          done: true,
                          value: undefined,
                        });
                      sent = true;
                      return Promise.resolve({ done: false, value: chunk(7) });
                    },
                    releaseLock: () => {},
                  };
                },
              },
            } as unknown as Response),
      ),
    );

    const fractions: number[] = [];
    await downloadAll({
      urls: ['/a.glb', '/b.glb'],
      signal: new AbortController().signal,
      onProgress: (p) => fractions.push(p.fraction),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(fractions.at(-1)).toBe(1);
  });

  it('handles a body that cannot be streamed', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'HEAD' ? headResponse(64) : bufferResponse(64),
      ),
    );

    const seen: number[] = [];
    await downloadAll({
      urls: ['/a.glb'],
      signal: new AbortController().signal,
      onProgress: (p) => seen.push(p.receivedBytes),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(seen.at(-1)).toBe(64);
  });

  it('retries an HTTP error status, not just a thrown fetch', async () => {
    let getAttempts = 0;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return Promise.resolve(headResponse(10));
      getAttempts += 1;
      return Promise.resolve(
        getAttempts === 1
          ? streamResponse([], 503)
          : streamResponse([chunk(10)]),
      );
    });

    const res = await downloadAll({
      urls: ['/a.glb'],
      signal: new AbortController().signal,
      onProgress: () => {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      random,
    });

    expect(getAttempts).toBe(2);
    expect(res.completed.has('/a.glb')).toBe(true);
  });

  it('keeps going when one asset fails and another succeeds', async () => {
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return Promise.resolve(headResponse(10));
      if (url === '/bad.glb')
        return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(streamResponse([chunk(10)]));
    });

    let thrown: unknown;
    try {
      await downloadAll({
        urls: ['/good.glb', '/bad.glb'],
        signal: new AbortController().signal,
        onProgress: () => {},
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep,
        random,
      });
    } catch (err) {
      thrown = err;
    }

    // The batch still rejects, but the good file is recorded so a retry can
    // resume instead of starting over.
    expect(thrown).toBeInstanceOf(AssetDownloadError);
    expect((thrown as AssetDownloadError).url).toBe('/bad.glb');
  });
});
