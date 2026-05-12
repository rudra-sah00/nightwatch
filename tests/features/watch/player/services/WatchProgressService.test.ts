import { describe, expect, it, vi } from 'vitest';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import {
  prepareProgressPayload,
  syncProgress,
} from '@/features/watch/player/services/WatchProgressService';

interface MockSocketResponse {
  success: boolean;
  error?: string;
  progress?: {
    progressSeconds: number;
    isCompleted: boolean;
  };
}

interface MockSocket {
  connected: boolean;
  emit: (
    event: string,
    payload: unknown,
    callback?: (res: MockSocketResponse) => void,
  ) => void;
}

describe('WatchProgressService', () => {
  const mockVideo = {
    currentTime: 100,
    duration: 1000,
    playbackRate: 1,
  } as unknown as HTMLVideoElement;

  describe('prepareProgressPayload', () => {
    it('should prepare payload for movie', () => {
      const metadata: VideoMetadata = {
        movieId: '123',
        type: 'movie',
        title: 'Test Movie',
        providerId: 's2',
        posterUrl: 'poster',
      };

      const payload = prepareProgressPayload(mockVideo, metadata, null);

      expect(payload).toMatchObject({
        contentId: '123',
        contentType: 'Movie',
      });
    });

    it('should prepare payload for series', () => {
      const metadata: VideoMetadata = {
        seriesId: 'show1',
        movieId: 'ep1',
        type: 'series',
        season: 1,
        episode: 1,
        title: 'Show',
        providerId: 's2',
      };

      const payload = prepareProgressPayload(mockVideo, metadata, null);

      expect(payload).toMatchObject({
        contentId: 'show1',
        contentType: 'Series',
        episodeId: '1-1',
        seasonNumber: 1,
        episodeNumber: 1,
      });
    });

    it('should prepare payload for series with season and episode', () => {
      const metadata: VideoMetadata = {
        movieId: 'ep1',
        seriesId: 'show1',
        type: 'series',
        title: 'Test Show',
        season: 1,
        episode: 1,
        providerId: 's2',
        posterUrl: 'poster',
      };

      const payload = prepareProgressPayload(mockVideo, metadata, 50);

      expect(payload).toMatchObject({
        contentId: 'show1',
        contentType: 'Series',
        progressSeconds: 100,
        durationSeconds: 1000,
        episodeId: '1-1',
        providerId: 's2',
        progressDelta: 50,
      });
    });

    it('should handle series metadata without season or episode', () => {
      const metadata: VideoMetadata = {
        movieId: 'ep1',
        seriesId: 'show1',
        type: 'series',
        title: 'Test Show',
        providerId: 's2',
      };

      const payload = prepareProgressPayload(mockVideo, metadata, null);
      expect(payload?.episodeId).toBeUndefined();
    });

    it('should calculate progressDelta correctly', () => {
      const metadata: VideoMetadata = {
        movieId: '123',
        type: 'movie',
        title: 'Test',
      };
      // lastProgress is 90, current is 100. Delta is 10.
      const payload = prepareProgressPayload(mockVideo, metadata, 90);
      expect(payload?.progressDelta).toBe(10);

      // lastProgress is 110 (ahead), current is 100. Delta should be 0.
      const payload2 = prepareProgressPayload(mockVideo, metadata, 110);
      expect(payload2?.progressDelta).toBe(0);
    });

    it('should return null if duration is missing', () => {
      const invalidVideo = {
        currentTime: 10,
        duration: 0,
      } as unknown as HTMLVideoElement;
      const metadata: VideoMetadata = {
        movieId: '123',
        type: 'movie',
        title: 'Test',
      };
      const payload = prepareProgressPayload(invalidVideo, metadata, null);
      expect(payload).toBeNull();
    });

    it('should return null if currentTime is 0', () => {
      const metadata: VideoMetadata = {
        movieId: '123',
        type: 'movie',
        title: 'Test',
      };
      const zeroVideo = {
        currentTime: 0,
        duration: 1000,
      } as unknown as HTMLVideoElement;
      const payload = prepareProgressPayload(zeroVideo, metadata, null);
      expect(payload).toBeNull();
    });
  });

  describe('syncProgress', () => {
    it('should emit progress to socket', () => {
      const mockSocket: MockSocket = {
        connected: true,
        emit: vi.fn((_event, _payload, cb) => cb?.({ success: true })),
      };

      const payload = {
        contentId: '123',
        progressSeconds: 100,
      };

      const onSuccess = vi.fn();
      syncProgress(
        mockSocket as unknown as Parameters<typeof syncProgress>[0],
        payload as unknown as Parameters<typeof syncProgress>[1],
        onSuccess,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'watch:update_progress',
        payload,
        expect.any(Function),
      );
      expect(onSuccess).toHaveBeenCalledWith(100);
    });

    it('should not emit if socket is disconnected', () => {
      const mockSocket: MockSocket = {
        connected: false,
        emit: vi.fn(),
      };

      syncProgress(
        mockSocket as unknown as Parameters<typeof syncProgress>[0],
        {} as unknown as Parameters<typeof syncProgress>[1],
        vi.fn(),
      );

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});
