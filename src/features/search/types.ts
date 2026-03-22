/**
 * Re-exports core content types from the centralized location.
 */
export * from '@/types/content';

// Keeping SearchHistory here as it is specific to the search feature
export interface SearchHistory {
  id: string;
  query: string;
  createdAt: string;
}
