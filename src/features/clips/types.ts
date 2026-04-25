export type ClipStatus = 'recording' | 'processing' | 'ready' | 'failed';

export interface ClipSegment {
  url: string;
  startTime: number;
  duration: number;
}

export interface Clip {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  duration: number;
  status: ClipStatus;
  matchId: string;
  createdAt: string;
}

export interface ClipsResponse {
  clips: Clip[];
  total: number;
  page: number;
  totalPages: number;
}
