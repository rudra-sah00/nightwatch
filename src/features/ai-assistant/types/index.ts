export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  statusText?: string;
  timestamp: Date;
  recommendations?: {
    id: string;
    imdbId?: string;
    type: string;
    title: string;
    subtitle?: string;
    poster?: string;
    posterUrl?: string;
    thumbnail?: string;
    imdbRating?: string;
    awards?: string;
    season?: number;
    episode?: number;
    videoUrl?: string;
  }[];
}

export type { User } from '@/types';
