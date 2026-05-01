/** Lifecycle status of a recorded clip. */
export type ClipStatus = 'recording' | 'processing' | 'ready' | 'failed';

/** A single video segment within a clip recording. */
export interface ClipSegment {
  /** URL of the segment media file. */
  url: string;
  /** Start time offset in seconds from the beginning of the clip. */
  startTime: number;
  /** Duration of this segment in seconds. */
  duration: number;
}

/** A recorded livestream clip. */
export interface Clip {
  /** Unique clip identifier. */
  id: string;
  /** User-editable clip title. */
  title: string;
  /** URL of the generated thumbnail image, or `null` if not yet available. */
  thumbnailUrl: string | null;
  /** URL of the processed video file, or `null` while still processing. */
  videoUrl: string | null;
  /** Total clip duration in seconds. */
  duration: number;
  /** Current processing status of the clip. */
  status: ClipStatus;
  /** ID of the livestream match this clip was recorded from. */
  matchId: string;
  /** Whether the clip is publicly shareable. */
  isPublic: boolean;
  /** Public share identifier, or `null` if not shared. */
  shareId: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Paginated response returned by the clips API. */
export interface ClipsResponse {
  /** Array of clips for the current page. */
  clips: Clip[];
  /** Total number of clips matching the query. */
  total: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Total number of available pages. */
  totalPages: number;
}
