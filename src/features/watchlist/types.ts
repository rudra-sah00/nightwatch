export interface WatchlistItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  posterUrl?: string;
  addedAt: string;
  providerId?: 's1' | 's2' | 's3';
}
