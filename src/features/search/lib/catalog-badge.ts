/**
 * Per-catalogue badge styling for search results.
 *
 * A NetMirror account spans several catalogues and one search returns them merged, so
 * each poster is badged with where the title came from. Colours come from the
 * neo-brutalist palette rather than brand colours — the badge has to sit on an arbitrary
 * poster and stay legible, which brand navy-on-black would not.
 *
 * Keys match the backend's `source` field. Disney+ titles arrive as `hs`/"JioHotstar":
 * the two share an API namespace and id space with nothing upstream to tell them apart,
 * so there is deliberately no `dp` entry.
 */
const CATALOG_BADGE: Record<string, string> = {
  nf: 'bg-neo-red',
  nr: 'bg-neo-green',
  pv: 'bg-neo-blue',
  hs: 'bg-neo-orange',
};

/** Fallback for a catalogue the client does not know yet, so a new one still renders. */
const CATALOG_BADGE_FALLBACK = 'bg-neo-surface';

export const catalogBadgeClass = (source?: string): string =>
  (source && CATALOG_BADGE[source]) || CATALOG_BADGE_FALLBACK;
