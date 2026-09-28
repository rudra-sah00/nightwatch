/**
 * Catalogue registry for the search UI.
 *
 * A NetMirror account spans several catalogues that the backend can search individually.
 * The order here is the order sections render in, and it matches the backend's
 * `SEARCHABLE_CATALOGS` so a progressive grid lands in the same sequence the merged search
 * used to return.
 *
 * Labels are duplicated client-side on purpose. A section's heading and its skeleton have
 * to render *before* any result arrives, so they cannot come from the `sourceLabel` on a
 * result. The backend still sends `sourceLabel` on every row; that remains the source of
 * truth for badging an individual poster.
 *
 * `nr` (New Releases) is deliberately absent: it has no search endpoint of its own and
 * arrives inside the Netflix section, tagged by id shape. Disney+ is absent for the same
 * reason — it shares JioHotstar's namespace and id space with nothing upstream to separate
 * them.
 */
export interface SearchCatalog {
  /** Matches the backend `source` field and the `?catalog=` query parameter. */
  id: string;
  /** Section heading. */
  label: string;
}

export const SEARCH_CATALOGS: readonly SearchCatalog[] = [
  { id: 'nf', label: 'Netflix' },
  { id: 'pv', label: 'Prime Video' },
  { id: 'hs', label: 'JioHotstar' },
] as const;
