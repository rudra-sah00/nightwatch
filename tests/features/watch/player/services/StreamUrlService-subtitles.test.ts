/**
 * Regression tests for PLAYER_AUDIT H2 — `normalizeRawUrls` discarded the subtitle
 * tracks it had just proxied.
 *
 * The token branch calls `normalizeWatchUrls`, which wraps every track's `src` through
 * `wrapInProxy` exactly as it does for captions and sprites, and then returned
 * `subtitleTracks: undefined`. The no-token branch above it preserved
 * `raw.subtitleTracks`, so only the authenticated path — the normal one — lost them.
 *
 * The tracks were recovered a moment later: `skipDiscovery` is `!streamParam`, so when a
 * stream param is present discovery runs and `applySubtitles` repopulates them. That is
 * why this showed up as subtitles appearing late rather than never, and why it is a
 * transient window rather than permanent loss. Closing the window is still worth it, and
 * a branch that silently throws away correct data is worth not having.
 */
import { describe, expect, it } from 'vitest';
import { normalizeRawUrls } from '@/features/watch/player/services/StreamUrlService';

const TOKEN = 'tok123';

const tracks = [
  { id: 'en', label: 'English', language: 'en', src: '/subs/en.vtt' },
  { id: 'hi', label: 'Hindi', language: 'hi', src: '/subs/hi.vtt' },
];

const raw = {
  streamUrl: '/hls/master.m3u8',
  captionUrl: '/subs/en.vtt',
  spriteVtt: '/sprites/s.vtt',
  qualities: [{ quality: '1080p', url: '/hls/1080.m3u8' }],
  subtitleTracks: tracks,
};

describe('normalizeRawUrls subtitle tracks (PLAYER_AUDIT H2)', () => {
  it('returns the subtitle tracks on the token-authenticated path', () => {
    const out = normalizeRawUrls(raw, TOKEN);

    expect(out.subtitleTracks).toHaveLength(2);
  });

  it('proxies each track src rather than passing the raw CDN path through', () => {
    const out = normalizeRawUrls(raw, TOKEN);

    // Asserted explicitly: iterating `?? []` would pass vacuously on undefined.
    expect(out.subtitleTracks).toHaveLength(2);
    for (const track of out.subtitleTracks ?? []) {
      expect(track.src).toContain(`/api/stream/cdn/${TOKEN}/`);
    }
  });

  it('preserves each track id, label and language', () => {
    const out = normalizeRawUrls(raw, TOKEN);

    expect(out.subtitleTracks?.map((t) => [t.id, t.label, t.language])).toEqual(
      [
        ['en', 'English', 'en'],
        ['hi', 'Hindi', 'hi'],
      ],
    );
  });

  /** The no-token branch already worked; it must keep working. */
  it('passes tracks through untouched when there is no token', () => {
    const out = normalizeRawUrls(raw, null);

    expect(out.subtitleTracks).toEqual(tracks);
  });

  it('leaves subtitleTracks undefined when the response carries none', () => {
    const out = normalizeRawUrls({ ...raw, subtitleTracks: undefined }, TOKEN);

    expect(out.subtitleTracks).toBeUndefined();
  });

  /** Guards against fixing subtitles by breaking a sibling field. */
  it('still normalizes captions, sprites and qualities', () => {
    const out = normalizeRawUrls(raw, TOKEN);

    expect(out.captionUrl).toContain(`/api/stream/cdn/${TOKEN}/`);
    expect(out.spriteVtt).toContain(`/api/stream/cdn/${TOKEN}/`);
    expect(out.qualities?.[0].url).toContain(`/api/stream/cdn/${TOKEN}/`);
  });
});
