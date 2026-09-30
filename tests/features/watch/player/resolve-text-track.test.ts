/**
 * Regression tests for PLAYER_AUDIT H14 — selecting one subtitle language displayed another.
 *
 * Activation indexed `video.textTracks` with the position of the track inside our own
 * `subtitleTracks`, on the assumption that the two lists correspond. They do not:
 * `use-video-element` appends a `fallback-captions` entry whenever `captionUrl` is set and is not
 * already present, `VideoElement` renders a further hardcoded `<track kind="captions">`, and
 * hls.js can inject its own for in-manifest WebVTT. `video.textTracks` is therefore reliably the
 * longer list, and the offset selected the wrong language or none at all.
 *
 * Tested through the extracted matcher rather than the DOM: happy-dom returns a fresh
 * `TextTrackList` and fresh `TextTrack` objects on every property access, so a `mode` written in
 * one read is invisible in the next and the effect's behaviour cannot be observed there.
 */
import { describe, expect, it } from 'vitest';
import { resolveTextTrackIndex } from '@/features/watch/player/ui/resolve-text-track';

/** What the settings menu offers. */
const SUBTITLES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ta', label: 'Tamil' },
];

/** What the element actually holds: the same three behind the hardcoded captions track. */
const WITH_LEADING_EXTRA = [
  { id: '', label: 'None' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ta', label: 'Tamil' },
];

describe('resolveTextTrackIndex (PLAYER_AUDIT H14)', () => {
  it('finds the track when the lists line up', () => {
    expect(resolveTextTrackIndex(SUBTITLES, 'hi', SUBTITLES)).toBe(1);
  });

  /** The defect: one extra leading track shifted every selection by one. */
  it('finds the track despite an extra leading track', () => {
    expect(resolveTextTrackIndex(WITH_LEADING_EXTRA, 'hi', SUBTITLES)).toBe(2);
  });

  it('is not fooled by two extra leading tracks', () => {
    const tracks = [{ id: '', label: 'None' }, ...WITH_LEADING_EXTRA];
    expect(resolveTextTrackIndex(tracks, 'ta', SUBTITLES)).toBe(4);
  });

  /** hls.js injects tracks with no id, so label is the only handle. */
  it('falls back to the label when the element track has no id', () => {
    const tracks = [
      { id: '', label: 'None' },
      { id: '', label: 'Hindi' },
    ];
    expect(resolveTextTrackIndex(tracks, 'hi', SUBTITLES)).toBe(1);
  });

  /**
   * An empty label must never match, or the first unlabelled injected track would answer every
   * request.
   */
  it('never matches on an empty label', () => {
    const tracks = [{ id: '', label: '' }];
    const subtitles = [{ id: 'x', label: '' }];
    expect(resolveTextTrackIndex(tracks, 'x', subtitles)).toBe(-1);
  });

  it('returns -1 when subtitles are off', () => {
    expect(resolveTextTrackIndex(WITH_LEADING_EXTRA, 'off', SUBTITLES)).toBe(
      -1,
    );
  });

  it('returns -1 for a null or empty selection', () => {
    expect(resolveTextTrackIndex(WITH_LEADING_EXTRA, null, SUBTITLES)).toBe(-1);
    expect(resolveTextTrackIndex(WITH_LEADING_EXTRA, '', SUBTITLES)).toBe(-1);
  });

  it('returns -1 for a track the element does not have', () => {
    expect(resolveTextTrackIndex(WITH_LEADING_EXTRA, 'de', SUBTITLES)).toBe(-1);
  });

  it('prefers an id match over an earlier label match', () => {
    const tracks = [
      { id: 'other', label: 'Hindi' },
      { id: 'hi', label: 'Hindi' },
    ];
    // The label match at 0 is a coincidence; the id at 1 is the real answer.
    expect(resolveTextTrackIndex(tracks, 'hi', SUBTITLES)).toBe(1);
  });
});
