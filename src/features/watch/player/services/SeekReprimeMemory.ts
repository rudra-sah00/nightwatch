import {
  getCachedLocalStorage,
  setCachedLocalStorage,
} from '@/lib/storage-cache';

/**
 * Remembers which titles need a buffer re-prime on seek, so the discovery costs one fatal
 * decode error per title rather than one per playback.
 *
 * `needsSeekReprimeRef` starts `false` and only flips once a seek has produced the
 * unrecoverable decode signature. That is deliberate — re-priming costs a fetch on seeks the
 * buffer would otherwise have served, and correctly authored streams (an IDR at every
 * segment start, as Apple's HLS Authoring Specification requires) should keep seeking
 * natively. But the ref lives at hook scope, so it resets on every mount: on affected content
 * the first seek of *every* playback was designed to fail, and that failure is not cheap. It
 * is a fatal error, a full stream refetch, an engine remount and a visible error toast.
 * Combined with resume-on-load, it usually happened before the user had touched anything.
 *
 * So the flag is cached per content id. Not forever: a stored flag would keep charging the
 * seek penalty long after an upstream re-encode fixed the title, which is exactly the
 * objection that kept it unpersisted. A TTL bounds that — after it lapses the title is
 * re-probed, and one playback pays for the answer again.
 *
 * Keyed on the content id rather than the stream URL, which carries a per-session token and
 * would never hit.
 *
 * The better fix is detecting non-IDR alignment up front, from the `avcC` box in the init
 * segment: a track with in-band parameter sets (`avc3`) needs re-priming and can be known
 * before the first seek rather than after it. That needs fMP4 box parsing and content to
 * validate against, so it is not done here.
 */

const STORAGE_KEY = 'nw:seek-reprime';
/**
 * How long a positive result is trusted.
 *
 * Long enough that a binge-watch never re-probes, short enough that a re-encode is picked up
 * within a week or so.
 */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Cap on remembered titles, so the entry cannot grow without bound. */
const MAX_ENTRIES = 200;

type Store = Record<string, number>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = getCachedLocalStorage(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return {};
    return parsed as Store;
  } catch {
    // Corrupt or unavailable storage must never break playback.
    return {};
  }
}

/**
 * Has this title already proved it needs re-priming, recently enough to trust?
 *
 * @param contentId - Stable content identifier. A falsy id always returns false, so a title
 *   we cannot key on simply probes as before.
 */
export function needsSeekReprime(contentId: string | undefined): boolean {
  if (!contentId) return false;
  const recordedAt = read()[contentId];
  if (typeof recordedAt !== 'number') return false;
  return Date.now() - recordedAt < TTL_MS;
}

/** Record that this title produced the unrecoverable decode signature on seek. */
export function rememberSeekReprime(contentId: string | undefined): void {
  if (!contentId || typeof window === 'undefined') return;
  try {
    const store = read();
    store[contentId] = Date.now();

    // Drop lapsed entries first, then the oldest, so eviction never discards a live flag
    // while a stale one survives.
    const live = Object.entries(store).filter(
      ([, at]) => Date.now() - at < TTL_MS,
    );
    const kept = live.sort((a, b) => b[1] - a[1]).slice(0, MAX_ENTRIES) as [
      string,
      number,
    ][];

    setCachedLocalStorage(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(kept)),
    );
  } catch {
    // Storage full or blocked. Re-priming still works for the rest of this playback via
    // the in-memory ref; only the memory across playbacks is lost.
  }
}
