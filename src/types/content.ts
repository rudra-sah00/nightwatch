/**
 * Content Type Definitions - Movies and Series
 */

export type ContentType = 'Movie' | 'Series';

export interface VideoMetadata {
  movie_id: string;
  title: string;
  content_type: ContentType;
  year?: number;
  imdb_id?: string;
  poster_url: string;
  poster_hd_url: string;
  cast?: string;
  rating?: number;
  duration?: number;
  genre?: string[];
  created_at: string;
}

export interface Episode {
  episode_id: string;
  series_id: string;
  episode_number: number;
  season_number?: number;
  title?: string;
  thumbnail_url: string;
  duration?: number;
  description?: string;
}

export interface VideoStream {
  movie_id: string;
  quality: string;
  resolution: string;
  bandwidth: number;
  playlist_url: string;
  is_default: boolean;
}

export interface AudioTrack {
  movie_id: string;
  track_number: number;
  language: string;
  language_name: string;
  playlist_url: string;
  is_default: boolean;
}

export interface VideoSpriteSheet {
  movie_id: string;
  sprite_url: string;
  sprite_width: number;
  sprite_height: number;
  tile_width: number;
  tile_height: number;
  tiles_per_row: number;
  total_tiles: number;
  interval_seconds: number;
}

export interface CompleteVideoData {
  metadata: VideoMetadata;
  master_playlist_url: string;
  streams: VideoStream[];
  audio_tracks: AudioTrack[];
  subtitles: SubtitleTrack[];
  sprite_sheets: VideoSpriteSheet[];
  auth_token: string;
  token_expires_at: string;
  episodes?: Episode[];
}

export interface SubtitleTrack {
  movie_id: string;
  language: string;
  language_name: string;
  vtt_url: string;
  kind: string;
}

export interface SeriesEpisodesResponse {
  series_id: string;
  title: string;
  poster_url: string;
  episodes: Episode[];
  total_episodes: number;
}

// Season info from post.php - proper season data upfront
export interface Season {
  season_number: number;
  season_id: string;
  episode_count: number;
}

// Complete show details from post.php
export interface ShowDetails {
  id: string;
  title: string;
  year?: string;
  description?: string;
  cast?: string;
  genre?: string;
  runtime?: string;
  rating?: string; // U/A 16+, A, etc.
  match_score?: string; // 48% match
  quality?: string; // HD
  content_type: ContentType;
  seasons: Season[];
  episodes: Episode[]; // First batch of episodes
  default_language?: string;
  poster_url: string;
}

export interface ShowDetailsResponse {
  show: ShowDetails;
}

export interface GetVideoResponse {
  video: CompleteVideoData;
}

export interface VideoPlaylistResponse {
  master_playlist: string;
  streams: VideoStream[];
  audio_tracks: AudioTrack[];
  token: string;
}

// Search result from backend
export interface SearchResultItem {
  id: string;
  title: string;
  type: ContentType;
  poster: string;
  year?: number;
  description?: string;
}

// Content card props
export interface ContentCardProps {
  id: string;
  title: string;
  poster?: string;
  posterHd?: string;
  year?: number;
  type: ContentType;
  onClick?: () => void;
}

// Content detail modal props
export interface ContentDetailProps {
  id: string;
  title: string;
  type: ContentType;
  poster?: string;
  posterHd?: string;
  year?: number;
  cast?: string;
  rating?: number;
  duration?: number;
  genre?: string[];
  description?: string;
  onClose: () => void;
  onPlay: (episodeId?: string) => void;
}
