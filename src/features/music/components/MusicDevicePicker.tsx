'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  useMusicPlaybackProgress,
  useMusicPlayerContext,
} from '../context/MusicPlayerContext';
import { useMusicDevices } from '../hooks/use-music-devices';
import { getDeviceName } from '../utils';

/** Connect/devices icon */
function ConnectIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <path d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15h-6.5A1.75 1.75 0 0 1 6 13.25zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25zm-6 0a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25H4V11H1.75A1.75 1.75 0 0 1 0 9.25v-6.5C0 1.784.784 1 1.75 1H4v1.5zM4 15H2v-1.5h2z" />
    </svg>
  );
}

function DeviceIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('mobile')) return <Smartphone className="w-5 h-5" />;
  if (lower.includes('desktop')) return <Monitor className="w-5 h-5" />;
  return <ConnectIcon className="w-5 h-5" />;
}

/**
 * Spotify Connect-like device picker + remote control.
 * - Click icon → centered modal with device list
 * - Transfer playback to any device
 * - See what's playing on target + control it (play/pause/next/prev)
 * - Local playback stops on transfer
 */
export function MusicDevicePicker() {
  const t = useTranslations('music');
  const player = useMusicPlayerContext();
  const { progress, duration } = useMusicPlaybackProgress();
  const {
    currentTrack,
    queue,
    isPlaying,
    play,
    seek,
    stop,
    next,
    prev,
    togglePlay,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    initEqualizer,
    setEqBands,
    setRemoteControlling,
    remoteQueue,
    isRemoteControlling,
  } = player;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const deviceName = getDeviceName();

  const openModal = () => {
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  };

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

  // Handle incoming transfer (MusicDeviceSync handles the actual playback)
  useEffect(() => {
    setOnTransfer(() => {
      toast.success(t('devicePicker.transferredHere'));
    });
  }, [setOnTransfer, t]);

  // Handle reclaim-playback: stop remote and start playing locally
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
      // Signal reclaim so auto-sync doesn't re-enter remote mode
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
          // Only stop local if the track hasn't changed since transfer was initiated
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

  // Target went offline — only act after initial device discovery settles
  const initialLoadRef = useRef(true);
  useEffect(() => {
    // Wait 5s after mount before enabling offline detection to allow all devices to respond
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

  // Sync remote state to context so MiniPlayer can show it
  // biome-ignore lint/correctness/useExhaustiveDependencies: progress/duration synced separately to avoid re-renders on every tick
  useEffect(() => {
    if (!isControlling) {
      return;
    }
    if (remoteState.track) {
      setRemoteControlling(
        true,
        remoteState.track,
        remoteState.isPlaying,
        remoteState.progress,
        remoteState.duration,
      );
    }
  }, [
    isControlling,
    remoteState.track,
    remoteState.isPlaying,
    setRemoteControlling,
  ]);

  // Sync progress/duration separately to avoid full re-render on every tick
  const remoteProgressRef = useRef(remoteState.progress);
  const remoteDurationRef = useRef(remoteState.duration);
  remoteProgressRef.current = remoteState.progress;
  remoteDurationRef.current = remoteState.duration;

  // biome-ignore lint/correctness/useExhaustiveDependencies: lightweight progress-only sync
  useEffect(() => {
    if (!isControlling || !remoteState.track) return;
    setRemoteControlling(
      true,
      remoteState.track,
      remoteState.isPlaying,
      remoteState.progress,
      remoteState.duration,
    );
  }, [remoteState.progress, remoteState.duration]);

  return (
    <>
      {/* Trigger button in MiniPlayer */}
      <button
        type="button"
        onClick={() => openModal()}
        className={`p-1.5 transition-colors ${isControlling || isRemoteControlling ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
        title={t('devicePicker.connectToDevice')}
      >
        <ConnectIcon className="w-3.5 h-3.5" />
      </button>

      {/* Modal */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
            onClick={() => closeModal()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal();
            }}
          >
            <div
              className={`flex flex-col items-center gap-4 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="dialog"
            >
              <h3 className="text-sm font-black font-headline uppercase tracking-widest text-white/60">
                {t('devicePicker.connect')}
              </h3>

              {/* Device list */}
              <div className="flex flex-col items-center gap-2 w-72">
                {/* This device */}
                <button
                  type="button"
                  onClick={() => {
                    if (isControlling || isRemoteControlling) {
                      const trackToPlay = isControlling
                        ? remoteState.track
                        : player.remoteTrack;
                      const prog = isControlling
                        ? remoteProgressRef.current
                        : player.remoteProgress;
                      const q = isControlling
                        ? remoteState.queue.length > 0
                          ? remoteState.queue
                          : remoteQueue
                        : remoteQueue;
                      if (isControlling) sendCommand('stop');
                      window.dispatchEvent(
                        new CustomEvent('music:reclaim-started'),
                      );
                      if (trackToPlay) {
                        play(
                          trackToPlay,
                          q.length > 0 ? q : [trackToPlay],
                          prog > 0 ? prog : undefined,
                        );
                      }
                      reclaimPlayback();
                      setRemoteControlling(false);
                      toast.success(t('devicePicker.playingHere'));
                    }
                    closeModal();
                  }}
                  className="w-full flex items-center gap-3 py-2 transition-colors hover:text-white"
                >
                  <DeviceIcon name={deviceName} />
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className={`text-sm font-headline font-bold uppercase tracking-wider ${!isControlling && !isRemoteControlling ? 'text-neo-yellow' : 'text-white/80'}`}
                    >
                      {deviceName}
                    </p>
                    {!isControlling && !isRemoteControlling && isPlaying && (
                      <p className="text-[10px] text-neo-yellow/70">
                        {t('devicePicker.listeningOn')}
                      </p>
                    )}
                  </div>
                  {!isControlling && !isRemoteControlling && isPlaying && (
                    <span className="w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
                  )}
                </button>

                {/* Other devices */}
                {devices.length > 0 ? (
                  devices.map((device) => {
                    const isActive = activeTarget === device.socketId;
                    return (
                      <button
                        key={device.socketId}
                        type="button"
                        disabled={!device.available}
                        onClick={() => {
                          if (!device.available) return;
                          if (currentTrack) {
                            setRemoteControlling(true, currentTrack, isPlaying);
                            transferToWithData(
                              device.socketId,
                              currentTrack,
                              queue,
                              progress,
                              isPlaying,
                              () => {
                                setRemoteControlling(false);
                                toast.error(
                                  t('devicePicker.connectFailed', {
                                    device: device.deviceName,
                                  }),
                                );
                              },
                              () => {
                                stop();
                                toast.success(
                                  t('devicePicker.playingOn', {
                                    device: device.deviceName,
                                  }),
                                );
                              },
                              device.deviceId,
                            );
                          } else {
                            transferTo(
                              device.socketId,
                              undefined,
                              device.deviceId,
                            );
                            toast.success(
                              t('devicePicker.playingOn', {
                                device: device.deviceName,
                              }),
                            );
                          }
                          closeModal();
                        }}
                        className={`w-full flex items-center gap-3 py-2 transition-colors ${
                          device.available
                            ? 'hover:text-white'
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <DeviceIcon name={device.deviceName} />
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className={`text-sm font-headline font-bold uppercase tracking-wider ${isActive ? 'text-neo-yellow' : 'text-white/80'}`}
                          >
                            {device.deviceName}
                          </p>
                          {!device.available ? (
                            <p className="text-[10px] text-destructive/70">
                              {t('devicePicker.watchingVideo')}
                            </p>
                          ) : isActive ? (
                            <p className="text-[10px] text-neo-yellow/70">
                              {t('devicePicker.listeningOn')}
                            </p>
                          ) : device.isPlaying ? (
                            <p className="text-[10px] text-neo-yellow font-bold">
                              {t('devicePicker.nowPlaying')}
                            </p>
                          ) : null}
                        </div>
                        {(device.isPlaying || isActive) && device.available && (
                          <span className="w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-white/40 text-center py-4">
                    {t('devicePicker.noDevices')}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="text-white/60 text-xs font-headline uppercase tracking-wider cursor-pointer hover:text-white mt-2"
                onClick={() => closeModal()}
              >
                cancel
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
