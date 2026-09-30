/** The subset of `TextTrack` that identifying one needs. */
export interface IdentifiableTrack {
  id: string;
  label: string;
}

/** The subset of our subtitle track definitions that identifying one needs. */
export interface SubtitleTrackRef {
  id: string;
  label: string;
}

/**
 * Which entry of `video.textTracks` corresponds to a selected subtitle id.
 *
 * Extracted from `use-video-element` so it can be tested: happy-dom returns a fresh
 * `TextTrackList` and fresh `TextTrack` objects on every property access, so a `mode` set in one
 * read is invisible in the next, and the behaviour cannot be observed through the DOM there.
 *
 * Matching is by identity, never by array position. Activation used to index `video.textTracks`
 * with the position of the track inside our own `subtitleTracks`, on the assumption that the two
 * lists correspond. They do not: `use-video-element` appends a `fallback-captions` entry whenever
 * `captionUrl` is set and is not already present, `VideoElement` renders a further hardcoded
 * `<track kind="captions">`, and hls.js can inject its own for in-manifest WebVTT. So
 * `video.textTracks` is reliably the longer list, and the offset made selecting one language
 * display another — or none.
 *
 * `id` is checked first because that is what `VideoElement` sets on each `<track>`. `label` is a
 * fallback for tracks the browser or hls.js created, where the id may be empty — and an empty
 * label is never matched, or every unlabelled injected track would match the first request.
 *
 * @returns The index to show, or -1 when nothing should be shown.
 */
export function resolveTextTrackIndex(
  textTracks: readonly IdentifiableTrack[],
  trackId: string | null | undefined,
  subtitleTracks: readonly SubtitleTrackRef[],
): number {
  if (!trackId || trackId === 'off') return -1;

  // Two passes, because an exact id match anywhere in the list is a stronger signal than a
  // label that merely happens to coincide earlier in it.
  for (let i = 0; i < textTracks.length; i++) {
    if (textTracks[i].id === trackId) return i;
  }

  const target = subtitleTracks.find((t) => t.id === trackId);
  if (!target || target.label === '') return -1;

  for (let i = 0; i < textTracks.length; i++) {
    const track = textTracks[i];
    if (track.label !== '' && track.label === target.label) return i;
  }
  return -1;
}
