import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMusicStore } from '../store/use-music-store';
import { useMusicDevices } from './use-music-devices';

/**
 * Encapsulates all device sync/remote-control side-effects:
 * - Handles incoming remote commands (play, pause, seek, etc.)
 * - Handles incoming transfers
 * - Reclaim-playback event listener
 * - Forwards new local plays to active target
 * - Detects target going offline
 * - Syncs remote state to useMusicStore
 *
 * Returns only what the UI layer needs to render the device picker.
 */
export function useMusicDeviceSync() {
  const t = useTranslations('music');
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const queue = useMusicStore((s) => s.queue);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const seek = useMusicStore((s) => s.seek);
  const stop = useMusicStore((s) => s.stop);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const setVolume = useMusicStore((s) => s.setVolume);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);
  const initEqualizer = useMusicStore((s) => s.initEqualizer);
  const setEqBands = useMusicStore((s) => s.setEqBands);
  const setRemoteControlling = useMusicStore((s) => s.setRemoteControlling);
  const remoteQueue = useMusicStore((s) => s.remoteQueue);
  const progress = useMusicStore((s) => s.progress);
  const duration = useMusicStore((s) => s.duration);

  const {
    devices,
    activeTarget,
    remoteState,
    transferTo,
    transferToWithData,
    sendCommand,
    reclaimPlayback,
    setOnCommand,
    setOnTransfer,
  } = useMusicDevices(currentTrack, isPlaying, progress, duration);

  // Handle incoming commands (when this device is the player)
  useEffect(() => {
    setOnCommand((cmd, value) => {
      switch (cmd) {
        case 'toggle_play':
          togglePlay();
          break;
        case 'next':
          next();
          break;
        case 'prev':
          prev();
          break;
        case 'seek':
          if (typeof value === 'number') seek(value);
          break;
        case 'volume':
          if (typeof value === 'number') setVolume(value);
          break;
        case 'eq':
          if (value) {
            initEqualizer();
            setEqBands(value as unknown as Parameters<typeof setEqBands>[0]);
            window.dispatchEvent(
              new CustomEvent('music:eq-updated', { detail: value }),
            );
          }
          break;
        case 'play_track':
          if (value) {
            play(value as unknown as Parameters<typeof play>[0], queue);
          }
          break;
        case 'stop':
          stop();
          break;
        case 'toggle_shuffle':
          toggleShuffle();
          break;
        case 'cycle_repeat':
          cycleRepeat();
          break;
      }
    });
  }, [
    setOnCommand,
    togglePlay,
    next,
    prev,
    seek,
    stop,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    initEqualizer,
    setEqBands,
    play,
    queue,
  ]);

  // Handle incoming transfer
  useEffect(() => {
    setOnTransfer(() => {
      toast.success(t('devicePicker.transferredHere'));
    });
  }, [setOnTransfer, t]);

  // Handle reclaim-playback
  const remoteProgressRef = useRef(remoteState.progress);
  remoteProgressRef.current = remoteState.progress;

  useEffect(() => {
    const handler = () => {
      const target = activeTarget;
      const trackToPlay = remoteState.track;
      const prog = remoteProgressRef.current;
      const q =
        remoteState.queue.length > 0
          ? remoteState.queue
          : remoteQueue.length > 0
            ? remoteQueue
            : trackToPlay
              ? [trackToPlay]
              : [];
      if (target) sendCommand('stop');
      window.dispatchEvent(new CustomEvent('music:reclaim-started'));
      if (trackToPlay) {
        play(trackToPlay, q, prog > 0 ? prog : undefined);
      }
      reclaimPlayback();
      setRemoteControlling(false);
    };
    window.addEventListener('music:reclaim-playback', handler);
    return () => window.removeEventListener('music:reclaim-playback', handler);
  }, [
    activeTarget,
    sendCommand,
    reclaimPlayback,
    setRemoteControlling,
    remoteState.track,
    remoteState.queue,
    play,
    remoteQueue,
  ]);

  // Forward new local plays to target
  const prevTrackIdRef = useRef(currentTrack?.id);
  useEffect(() => {
    if (!activeTarget || !currentTrack) return;
    if (prevTrackIdRef.current !== currentTrack.id) {
      prevTrackIdRef.current = currentTrack.id;
      const transferredTrackId = currentTrack.id;
      transferToWithData(
        activeTarget,
        currentTrack,
        queue,
        0,
        true,
        undefined,
        () => {
          if (prevTrackIdRef.current === transferredTrackId) {
            stop();
          }
        },
      );
    }
  }, [
    currentTrack?.id,
    activeTarget,
    currentTrack,
    queue,
    transferToWithData,
    stop,
  ]);

  // Target went offline detection
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current) {
      const timer = setTimeout(() => {
        initialLoadRef.current = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (activeTarget && !devices.find((d) => d.socketId === activeTarget)) {
      reclaimPlayback();
      setRemoteControlling(false);
      toast.info(t('devicePicker.disconnected'));
    }
  }, [devices, activeTarget, reclaimPlayback, setRemoteControlling, t]);

  const isControlling = !!activeTarget;

  // Sync remote state to context (excluding progress/duration — handled below)
  useEffect(() => {
    if (!isControlling) return;
    if (remoteState.track) {
      setRemoteControlling(
        true,
        remoteState.track,
        remoteState.isPlaying,
        undefined,
        undefined,
      );
    }
  }, [
    isControlling,
    remoteState.track,
    remoteState.isPlaying,
    setRemoteControlling,
  ]);

  // Lightweight progress-only sync (fires on high-frequency progress/duration updates)
  useEffect(() => {
    if (!isControlling || !remoteState.track) return;
    setRemoteControlling(
      true,
      remoteState.track,
      remoteState.isPlaying,
      remoteState.progress,
      remoteState.duration,
    );
  }, [
    isControlling,
    remoteState.track,
    remoteState.isPlaying,
    remoteState.progress,
    remoteState.duration,
    setRemoteControlling,
  ]);

  return {
    devices,
    activeTarget,
    remoteState,
    isControlling,
    transferTo,
    transferToWithData,
    sendCommand,
    reclaimPlayback,
    remoteProgressRef,
  };
}
