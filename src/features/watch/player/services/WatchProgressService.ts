/**
 * WatchProgressService — Handles socket-based progress syncing and activity tracking.
 */

import {
  invalidateContinueWatchingCache,
  invalidateProgressCache,
} from '@/features/watch/api';
import type { VideoMetadata } from '../context/types';

interface SocketResponse {
  success: boolean;
  error?: string;
  progress?: {
    progressSeconds: number;
    isCompleted: boolean;
    [key: string]: unknown;
  };
}

interface SocketEmitter {
  connected: boolean;
  emit: (
    event: string,
    payload: unknown,
    callback?: (res: SocketResponse) => void,
  ) => void;
}

/**
 * Prepares the payload for progress update.
 */
export function prepareProgressPayload(
  video: HTMLVideoElement,
  metadata: VideoMetadata,
  lastProgress: number | null,
  hasMoreEpisodes = true,
) {
  if (metadata.type === 'livestream') return null;

  const currentTime = video.currentTime;
  const duration = video.duration;

  if (!duration || Number.isNaN(duration) || currentTime === 0) return null;

  const contentId =
    metadata.type === 'series' && metadata.seriesId
      ? metadata.seriesId
      : metadata.movieId;

  const roundedCurrentTime = Math.floor(currentTime);

  // S2 duration fallback
  const apiDuration = (metadata as { apiDurationSeconds?: number })
    .apiDurationSeconds;
  const effectiveDuration = Number.isFinite(duration)
    ? duration
    : (apiDuration ?? 0);

  const progressDelta =
    lastProgress !== null ? Math.max(0, roundedCurrentTime - lastProgress) : 0;

  return {
    contentId,
    contentType: metadata.type === 'series' ? 'Series' : 'Movie',
    title: metadata.title,
    posterUrl: metadata.posterUrl,
    seasonNumber: metadata.season,
    episodeNumber: metadata.episode,
    episodeTitle: metadata.episodeTitle,
    episodeId:
      metadata.type === 'series' && metadata.season && metadata.episode
        ? `${metadata.season}-${metadata.episode}`
        : undefined,
    progressSeconds: roundedCurrentTime,
    durationSeconds: Number.isFinite(duration)
      ? Math.floor(duration)
      : Math.floor(effectiveDuration),
    playbackRate: video.playbackRate,
    progressDelta,
    providerId: metadata.providerId,
    hasMoreEpisodes: metadata.type === 'series' ? hasMoreEpisodes : undefined,
  };
}

/**
 * Syncs progress to the backend via socket.
 */
export function syncProgress(
  socket: SocketEmitter | null | undefined,
  payload: ReturnType<typeof prepareProgressPayload>,
  onSuccess: (roundedCurrentTime: number) => void,
) {
  if (!socket?.connected || !payload) return;

  socket.emit('watch:update_progress', payload, (res: SocketResponse) => {
    if (res?.success) {
      onSuccess(payload.progressSeconds);
      invalidateProgressCache(payload.contentId as string);
      invalidateContinueWatchingCache();
    }
  });
}

/**
 * Syncs watch activity (time spent) to the backend.
 */
export function syncActivity(
  socket: SocketEmitter | null | undefined,
  seconds: number,
  date: string,
  forceFlush: boolean,
  onSuccess: (sentSeconds: number) => void,
) {
  if (!socket?.connected || seconds <= 0) return;

  socket.emit(
    'watch:record_time',
    {
      seconds,
      forceFlush,
      date,
    },
    (res: SocketResponse) => {
      if (res?.success) {
        onSuccess(seconds);
      }
    },
  );
}
