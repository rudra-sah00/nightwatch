import { beforeEach, describe, expect, it } from 'vitest';
import {
  type AudioTrack,
  initialPlayerState,
  type PlayerAction,
  type PlayerState,
  playerReducer,
  type Quality,
  type SubtitleTrack,
} from '@/features/watch/player/types';

describe('Player Types and Reducer', () => {
  describe('initialPlayerState', () => {
    it('should have correct initial values', () => {
      expect(initialPlayerState).toEqual({
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
      });
    });
  });

  describe('playerReducer', () => {
    let state: PlayerState;

    beforeEach(() => {
      state = { ...initialPlayerState };
    });

    describe('Play/Pause actions', () => {
      it('should handle PLAY action', () => {
        const action: PlayerAction = { type: 'PLAY' };
        const newState = playerReducer(state, action);

        expect(newState.isPlaying).toBe(true);
        expect(newState.isPaused).toBe(false);
      });

      it('should handle PAUSE action', () => {
        state.isPlaying = true;
        state.isPaused = false;

        const action: PlayerAction = { type: 'PAUSE' };
        const newState = playerReducer(state, action);

        expect(newState.isPlaying).toBe(false);
        expect(newState.isPaused).toBe(true);
      });

      it('should handle TOGGLE_PLAY from paused to playing', () => {
        const action: PlayerAction = { type: 'TOGGLE_PLAY' };
        const newState = playerReducer(state, action);

        expect(newState.isPlaying).toBe(true);
        expect(newState.isPaused).toBe(false);
      });

      it('should handle TOGGLE_PLAY from playing to paused', () => {
        state.isPlaying = true;
        state.isPaused = false;

        const action: PlayerAction = { type: 'TOGGLE_PLAY' };
        const newState = playerReducer(state, action);

        expect(newState.isPlaying).toBe(false);
        expect(newState.isPaused).toBe(true);
      });
    });

    describe('Volume actions', () => {
      it('should handle MUTE action', () => {
        const action: PlayerAction = { type: 'MUTE' };
        const newState = playerReducer(state, action);

        expect(newState.isMuted).toBe(true);
      });

      it('should handle UNMUTE action', () => {
        state.isMuted = true;

        const action: PlayerAction = { type: 'UNMUTE' };
        const newState = playerReducer(state, action);

        expect(newState.isMuted).toBe(false);
      });

      it('should handle TOGGLE_MUTE from unmuted to muted', () => {
        const action: PlayerAction = { type: 'TOGGLE_MUTE' };
        const newState = playerReducer(state, action);

        expect(newState.isMuted).toBe(true);
      });

      it('should handle TOGGLE_MUTE from muted to unmuted', () => {
        state.isMuted = true;

        const action: PlayerAction = { type: 'TOGGLE_MUTE' };
        const newState = playerReducer(state, action);

        expect(newState.isMuted).toBe(false);
      });

      it('should handle SET_VOLUME action', () => {
        const action: PlayerAction = { type: 'SET_VOLUME', volume: 0.5 };
        const newState = playerReducer(state, action);

        expect(newState.volume).toBe(0.5);
      });
    });

    describe('Time actions', () => {
      it('should handle SET_TIME action', () => {
        const action: PlayerAction = { type: 'SET_TIME', time: 120 };
        const newState = playerReducer(state, action);

        expect(newState.currentTime).toBe(120);
      });

      it('should handle SET_DURATION action', () => {
        const action: PlayerAction = { type: 'SET_DURATION', duration: 3600 };
        const newState = playerReducer(state, action);

        expect(newState.duration).toBe(3600);
      });

      it('should handle SET_BUFFERED action', () => {
        const action: PlayerAction = { type: 'SET_BUFFERED', buffered: 180 };
        const newState = playerReducer(state, action);

        expect(newState.buffered).toBe(180);
      });
    });

    describe('Loading and buffering actions', () => {
      it('should handle SET_LOADING action', () => {
        state.isLoading = false;

        const action: PlayerAction = { type: 'SET_LOADING', isLoading: true };
        const newState = playerReducer(state, action);

        expect(newState.isLoading).toBe(true);
      });

      it('should handle SET_BUFFERING action', () => {
        const action: PlayerAction = {
          type: 'SET_BUFFERING',
          isBuffering: true,
        };
        const newState = playerReducer(state, action);

        expect(newState.isBuffering).toBe(true);
      });
    });

    describe('Error actions', () => {
      it('should handle SET_ERROR action with error message', () => {
        const action: PlayerAction = {
          type: 'SET_ERROR',
          error: 'Video failed to load',
        };
        const newState = playerReducer(state, action);

        expect(newState.error).toBe('Video failed to load');
      });

      it('should handle SET_ERROR action with null', () => {
        state.error = 'Previous error';

        const action: PlayerAction = { type: 'SET_ERROR', error: null };
        const newState = playerReducer(state, action);

        expect(newState.error).toBeNull();
      });
    });

    describe('Fullscreen actions', () => {
      it('should handle SET_FULLSCREEN action', () => {
        const action: PlayerAction = {
          type: 'SET_FULLSCREEN',
          isFullscreen: true,
        };
        const newState = playerReducer(state, action);

        expect(newState.isFullscreen).toBe(true);
      });
    });

    describe('Controls actions', () => {
      it('should handle SHOW_CONTROLS action', () => {
        state.showControls = false;

        const action: PlayerAction = { type: 'SHOW_CONTROLS' };
        const newState = playerReducer(state, action);

        expect(newState.showControls).toBe(true);
      });

      it('should handle HIDE_CONTROLS action', () => {
        const action: PlayerAction = { type: 'HIDE_CONTROLS' };
        const newState = playerReducer(state, action);

        expect(newState.showControls).toBe(false);
      });
    });

    describe('Playback rate actions', () => {
      it('should handle SET_PLAYBACK_RATE action', () => {
        const action: PlayerAction = { type: 'SET_PLAYBACK_RATE', rate: 1.5 };
        const newState = playerReducer(state, action);

        expect(newState.playbackRate).toBe(1.5);
      });
    });

    describe('Quality actions', () => {
      it('should handle SET_QUALITIES action', () => {
        const qualities: Quality[] = [
          { label: '1080p', height: 1080, bandwidth: 5000000 },
          { label: '720p', height: 720, bandwidth: 2500000 },
          { label: '480p', height: 480, bandwidth: 1000000 },
        ];

        const action: PlayerAction = { type: 'SET_QUALITIES', qualities };
        const newState = playerReducer(state, action);

        expect(newState.qualities).toEqual(qualities);
        expect(newState.qualities).toHaveLength(3);
      });

      it('should handle SET_CURRENT_QUALITY action', () => {
        const action: PlayerAction = {
          type: 'SET_CURRENT_QUALITY',
          quality: '1080p',
        };
        const newState = playerReducer(state, action);

        expect(newState.currentQuality).toBe('1080p');
      });
    });

    describe('Audio track actions', () => {
      it('should handle SET_AUDIO_TRACKS action', () => {
        const audioTracks: AudioTrack[] = [
          { id: 'en', label: 'English', language: 'en', isDefault: true },
          { id: 'es', label: 'Spanish', language: 'es' },
        ];

        const action: PlayerAction = { type: 'SET_AUDIO_TRACKS', audioTracks };
        const newState = playerReducer(state, action);

        expect(newState.audioTracks).toEqual(audioTracks);
        expect(newState.audioTracks).toHaveLength(2);
      });

      it('should handle SET_CURRENT_AUDIO_TRACK action', () => {
        const action: PlayerAction = {
          type: 'SET_CURRENT_AUDIO_TRACK',
          trackId: 'es',
        };
        const newState = playerReducer(state, action);

        expect(newState.currentAudioTrack).toBe('es');
      });

      it('should handle SET_CURRENT_AUDIO_TRACK with null', () => {
        state.currentAudioTrack = 'en';

        const action: PlayerAction = {
          type: 'SET_CURRENT_AUDIO_TRACK',
          trackId: null,
        };
        const newState = playerReducer(state, action);

        expect(newState.currentAudioTrack).toBeNull();
      });
    });

    describe('Subtitle track actions', () => {
      it('should handle SET_SUBTITLE_TRACKS action', () => {
        const subtitleTracks: SubtitleTrack[] = [
          {
            id: 'en',
            label: 'English',
            language: 'en',
            src: 'https://example.com/en.vtt',
          },
          {
            id: 'es',
            label: 'Spanish',
            language: 'es',
            src: 'https://example.com/es.vtt',
          },
        ];

        const action: PlayerAction = {
          type: 'SET_SUBTITLE_TRACKS',
          subtitleTracks,
        };
        const newState = playerReducer(state, action);

        expect(newState.subtitleTracks).toEqual(subtitleTracks);
        expect(newState.subtitleTracks).toHaveLength(2);
      });

      it('should handle SET_CURRENT_SUBTITLE_TRACK action', () => {
        const action: PlayerAction = {
          type: 'SET_CURRENT_SUBTITLE_TRACK',
          trackId: 'es',
        };
        const newState = playerReducer(state, action);

        expect(newState.currentSubtitleTrack).toBe('es');
      });

      it('should handle SET_CURRENT_SUBTITLE_TRACK with null', () => {
        state.currentSubtitleTrack = 'en';

        const action: PlayerAction = {
          type: 'SET_CURRENT_SUBTITLE_TRACK',
          trackId: null,
        };
        const newState = playerReducer(state, action);

        expect(newState.currentSubtitleTrack).toBeNull();
      });
    });

    describe('State immutability', () => {
      it('should not mutate original state', () => {
        const originalState = { ...initialPlayerState };

        playerReducer(state, { type: 'PLAY' });

        expect(state).toEqual(originalState);
      });

      it('should return new state object', () => {
        const newState = playerReducer(state, { type: 'PLAY' });

        expect(newState).not.toBe(state);
      });
    });
  });

  describe('Type definitions', () => {
    it('should define VideoMetadata for movie', () => {
      const metadata = {
        title: 'Test Movie',
        type: 'movie' as const,
        movieId: 'movie-123',
        posterUrl: 'https://example.com/poster.jpg',
        description: 'A test movie',
        year: '2024',
      };

      expect(metadata.type).toBe('movie');
      expect(metadata.movieId).toBe('movie-123');
    });

    it('should define VideoMetadata for series', () => {
      const metadata = {
        title: 'Test Series',
        type: 'series' as const,
        season: 1,
        episode: 5,
        movieId: 'episode-123',
        seriesId: 'series-456',
        posterUrl: 'https://example.com/poster.jpg',
        description: 'A test series',
        year: '2024',
      };

      expect(metadata.type).toBe('series');
      expect(metadata.season).toBe(1);
      expect(metadata.episode).toBe(5);
      expect(metadata.seriesId).toBe('series-456');
    });
  });
});
