export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  recommendations?: {
    id: string;
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

export interface User {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  profilePhoto?: string | null;
}
