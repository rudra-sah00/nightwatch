/**
 * Search & Content Type Definitions
 */

export interface SearchResult {
  id: string;
  title: string;
  year?: number;
  type?: 'movie' | 'series';
  poster?: string;
  description?: string;
}

export interface SearchState {
  results: SearchResult[];
  loading: boolean;
  searched: boolean;
  query: string;
  error: string | null;
}

export interface PopularSearch {
  term: string;
  icon?: string;
}
