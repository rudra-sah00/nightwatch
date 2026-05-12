// Player state types
export interface AudioTrack {
  id: string;
  label: string;
  language: string;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  playbackRate: number;
  error: string | null;
  showControls: boolean;
  qualities: Quality[];
  currentQuality: string;
  // Audio/Subtitle tracks
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  currentAudioTrack: string | null;
  currentSubtitleTrack: string | null;
}

export interface Quality {
  label: string;
  height: number;
  bandwidth: number;
}

export interface VideoMetadata {
  title: string;
  type: 'movie' | 'series' | 'livestream';
  season?: number;
  episode?: number;
  episodeTitle?: string; // For series: the specific episode title
  movieId: string;
  seriesId?: string; // For series: the parent series ID (used as contentId for continue watching)
  posterUrl?: string;
  description?: string;
  year?: string;
  providerId?: 's2' | 's2';
  /** API-sourced duration in seconds used as fallback when video.duration is Infinity (S2 MP4). */
  apiDurationSeconds?: number;
  /** Second logo/poster for live events (e.g. away team logo). */
  secondaryPosterUrl?: string;
}

// Player actions
export type PlayerAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'MUTE' }
  | { type: 'UNMUTE' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_BUFFERED'; buffered: number }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_BUFFERING'; isBuffering: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_FULLSCREEN'; isFullscreen: boolean }
  | { type: 'SHOW_CONTROLS' }
  | { type: 'HIDE_CONTROLS' }
  | { type: 'SET_PLAYBACK_RATE'; rate: number }
  | { type: 'SET_QUALITIES'; qualities: Quality[] }
  | { type: 'SET_CURRENT_QUALITY'; quality: string }
  | { type: 'SET_AUDIO_TRACKS'; audioTracks: AudioTrack[] }
  | { type: 'SET_SUBTITLE_TRACKS'; subtitleTracks: SubtitleTrack[] }
  | { type: 'SET_CURRENT_AUDIO_TRACK'; trackId: string | null }
  | { type: 'SET_CURRENT_SUBTITLE_TRACK'; trackId: string | null };

export const initialPlayerState: PlayerState = {
  isPlaying: false,
  isPaused: true,
  isMuted: false,
  isFullscreen: false,
  isBuffering: false,
  isLoading: true,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  playbackRate: 1,
  error: null,
  showControls: true,
  qualities: [],
  currentQuality: 'auto',
  audioTracks: [],
  subtitleTracks: [],
  currentAudioTrack: null,
  currentSubtitleTrack: null,
};

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
): PlayerState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true, isPaused: false, isLoading: false };
    case 'PAUSE':
      return { ...state, isPlaying: false, isPaused: true };
    case 'TOGGLE_PLAY':
      return {
        ...state,
        isPlaying: !state.isPlaying,
        isPaused: state.isPlaying,
      };
    case 'MUTE':
      return { ...state, isMuted: true };
    case 'UNMUTE':
      return { ...state, isMuted: false };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume, isMuted: action.volume === 0 };
    case 'SET_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_BUFFERED':
      return { ...state, buffered: action.buffered };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_BUFFERING':
      return { ...state, isBuffering: action.isBuffering };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.isFullscreen };
    case 'SHOW_CONTROLS':
      return { ...state, showControls: true };
    case 'HIDE_CONTROLS':
      return { ...state, showControls: false };
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.rate };
    case 'SET_QUALITIES':
      return { ...state, qualities: action.qualities };
    case 'SET_CURRENT_QUALITY':
      return { ...state, currentQuality: action.quality };
    case 'SET_AUDIO_TRACKS':
      return { ...state, audioTracks: action.audioTracks };
    case 'SET_SUBTITLE_TRACKS':
      return { ...state, subtitleTracks: action.subtitleTracks };
    case 'SET_CURRENT_AUDIO_TRACK':
      return { ...state, currentAudioTrack: action.trackId };
    case 'SET_CURRENT_SUBTITLE_TRACK':
      return { ...state, currentSubtitleTrack: action.trackId };
    default:
      return state;
  }
}
