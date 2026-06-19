'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { MusicTrack } from '../api';
import { getSong } from '../api';
import { AudioEngine } from '../engine/audio-engine';
import { useMusicProgress } from '../hooks/use-music-progress';
import { connectMusicEngine, useMusicStore } from '../store/use-music-store';

/**
 * Headless component that initializes the AudioEngine singleton and connects it
 * to the Zustand store. Replaces the old MusicPlayerProvider context wrapper.
 * Renders `null` — side-effect only.
 */
export function MusicEngineInit() {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    const unsub = connectMusicEngine(engine);

    const onGapless = (e: Event) =>
      engine.setGapless((e as CustomEvent).detail);
    const onCrossfade = (e: Event) =>
      engine.setCrossfadeDuration((e as CustomEvent).detail);
    window.addEventListener('music:set-gapless', onGapless);
    window.addEventListener('music:set-crossfade', onCrossfade);

    return () => {
      unsub();
      window.removeEventListener('music:set-gapless', onGapless);
      window.removeEventListener('music:set-crossfade', onCrossfade);
      engine.destroy();
    };
  }, []);

  // Track daily listening time
  const isPlaying = useMusicStore((s) => s.isPlaying);
  useMusicProgress({ isPlaying });

  // Record implicit listen at 60%
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const progress = useMusicStore((s) => s.progress);
  const listenRecordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentTrack?.id !== listenRecordedRef.current) {
      listenRecordedRef.current = null;
    }
    if (
      currentTrack &&
      progress >= 60 &&
      listenRecordedRef.current !== currentTrack.id
    ) {
      listenRecordedRef.current = currentTrack.id;
      import('@/features/music-discover/api').then((m) =>
        m.recordListen(currentTrack.id).catch(() => {}),
      );
    }
  }, [currentTrack, progress]);

  // Stop local playback on remote takeover
  useEffect(() => {
    const onTakeover = () => engineRef.current?.stop();
    window.addEventListener('music:remote-takeover', onTakeover);
    return () =>
      window.removeEventListener('music:remote-takeover', onTakeover);
  }, []);

  // Ask AI music events
  const duckVolRef = useRef(-1);
  useEffect(() => {
    const handleSong = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.track) {
        engineRef.current?.playTrack(detail.track, [detail.track]);
      } else if (detail.songId) {
        getSong(detail.songId)
          .then((song) => {
            if (song) engineRef.current?.playTrack(song, [song]);
          })
          .catch(() => {});
      }
    };
    const handlePlaylist = (e: Event) => {
      const { tracks } = (e as CustomEvent).detail as { tracks: MusicTrack[] };
      if (tracks?.length) engineRef.current?.playTrack(tracks[0], tracks);
    };
    const handleControl = (e: Event) => {
      const { action } = (e as CustomEvent).detail as { action: string };
      const engine = engineRef.current;
      if (!engine) return;
      switch (action) {
        case 'pause':
          if (engine.getState().isPlaying) engine.togglePlay();
          break;
        case 'resume':
          if (!engine.getState().isPlaying) engine.togglePlay();
          break;
        case 'next':
          engine.next();
          break;
        case 'previous':
          engine.prev();
          break;
        case 'stop':
          engine.stop();
          break;
      }
    };
    const handleDuck = (e: Event) => {
      const { duck } = (e as CustomEvent).detail as { duck: boolean };
      const engine = engineRef.current;
      if (!engine) return;
      if (duck) {
        duckVolRef.current = engine.getState().volume;
        engine.setVolume(Math.min(duckVolRef.current * 0.15, 0.1));
      } else if (duckVolRef.current >= 0) {
        engine.setVolume(duckVolRef.current);
        duckVolRef.current = -1;
      }
    };
    window.addEventListener('ask-ai:play-music', handleSong);
    window.addEventListener('ask-ai:play-playlist', handlePlaylist);
    window.addEventListener('ask-ai:music-control', handleControl);
    window.addEventListener('ask-ai:duck', handleDuck);
    return () => {
      window.removeEventListener('ask-ai:play-music', handleSong);
      window.removeEventListener('ask-ai:play-playlist', handlePlaylist);
      window.removeEventListener('ask-ai:music-control', handleControl);
      window.removeEventListener('ask-ai:duck', handleDuck);
    };
  }, []);

  // Pause on DM voice call
  const wasPlayingBeforeCallRef = useRef(false);
  useEffect(() => {
    const handleCallStart = () => {
      const engine = engineRef.current;
      if (!engine) return;
      wasPlayingBeforeCallRef.current = engine.getState().isPlaying;
      if (engine.getState().isPlaying) engine.togglePlay();
    };
    const handleCallEnd = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (wasPlayingBeforeCallRef.current && !engine.getState().isPlaying) {
        engine.togglePlay();
      }
      wasPlayingBeforeCallRef.current = false;
    };
    window.addEventListener('dm-call:start', handleCallStart);
    window.addEventListener('dm-call:end', handleCallEnd);
    return () => {
      window.removeEventListener('dm-call:start', handleCallStart);
      window.removeEventListener('dm-call:end', handleCallEnd);
    };
  }, []);

  // Broadcast music activity to friends
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket?.connected) return;

    const emitActivity = () => {
      const { currentTrack: t } = useMusicStore.getState();
      if (t) {
        socket.emit('watch:set_activity', {
          type: 'music',
          title: t.title,
          artist: t.artist ?? null,
          season: null,
          episode: null,
          episodeTitle: null,
          posterUrl: t.image ?? null,
          secondaryPosterUrl: null,
        });
      }
    };

    let intervalId: NodeJS.Timeout;
    if (isPlaying && currentTrack) {
      emitActivity();
      intervalId = setInterval(emitActivity, 3 * 60 * 1000);
    } else if (!currentTrack) {
      socket.emit('watch:clear_activity');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, isPlaying, currentTrack]);

  useEffect(() => {
    return () => {
      socket?.emit('watch:clear_activity');
    };
  }, [socket]);

  return null;
}
