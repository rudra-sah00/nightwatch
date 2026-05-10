'use client';

import { Monitor, Smartphone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
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
    initEqualizer,
    setEqBands,
    setRemoteControlling,
    remoteQueue,
    isRemoteControlling,
  } = player;
  const [open, setOpen] = useState(false);
  const deviceName = getDeviceName();

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

  // Forward remote commands from MiniPlayer to the target device
  useEffect(() => {
    const handler = (e: Event) => {
      if (!activeTarget) return;
      const detail = (e as CustomEvent).detail;
      const cmd = typeof detail === 'string' ? detail : detail?.command;
      const value = typeof detail === 'object' ? detail?.value : undefined;
      if (cmd === 'stop') {
        const trackToPlay = remoteState.track;
        const prog = remoteProgressRef.current;
        sendCommand('stop'); // Stop playback on target device
        if (trackToPlay) {
          play(
            trackToPlay,
            remoteQueue.length > 0 ? remoteQueue : [trackToPlay],
            prog > 0 ? prog : undefined,
          );
        }
        reclaimPlayback();
        setRemoteControlling(false);
      } else if (cmd === 'seek') {
        sendCommand(cmd, typeof value === 'number' ? value : undefined);
      } else {
        sendCommand(cmd);
      }
    };
    window.addEventListener('music:remote-command', handler);
    return () => window.removeEventListener('music:remote-command', handler);
  }, [
    activeTarget,
    sendCommand,
    reclaimPlayback,
    setRemoteControlling,
    remoteState.track,
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
    // Skip until devices have been discovered (at least one response received)
    if (initialLoadRef.current) {
      if (devices.length > 0) initialLoadRef.current = false;
      return;
    }
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
        onClick={() => setOpen(true)}
        className={`p-1.5 transition-colors ${isControlling || isRemoteControlling ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
        title={t('devicePicker.connectToDevice')}
      >
        <ConnectIcon className="w-3.5 h-3.5" />
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 animate-in fade-in duration-200" />
          <div className="relative w-[340px] max-w-[90vw] bg-card border-2 border-border rounded-xl shadow-2xl animate-in slide-in-from-bottom-6 duration-400 ease-out overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <ConnectIcon className="w-4 h-4 text-neo-yellow" />
                <h3 className="text-sm font-bold font-headline uppercase tracking-wider">
                  {t('devicePicker.connect')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-foreground/40 hover:text-foreground rounded-full hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device list */}
            <div className="px-3 pb-4 space-y-1">
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
                    if (isControlling) sendCommand('stop');
                    if (trackToPlay) {
                      play(
                        trackToPlay,
                        remoteQueue.length > 0 ? remoteQueue : [trackToPlay],
                        prog > 0 ? prog : undefined,
                      );
                    }
                    reclaimPlayback();
                    setRemoteControlling(false);
                    toast.success(t('devicePicker.playingHere'));
                  }
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  !isControlling && !isRemoteControlling
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent'
                }`}
              >
                <DeviceIcon name={deviceName} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium">{deviceName}</p>
                  {!isControlling && !isRemoteControlling && isPlaying && (
                    <p className="text-[10px] text-primary">
                      {t('devicePicker.listeningOn')}
                    </p>
                  )}
                </div>
                {!isControlling && !isRemoteControlling && isPlaying && (
                  <span className="w-2.5 h-2.5 bg-neo-yellow rounded-full animate-pulse" />
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
                          // Set remote state BEFORE stop() so MiniPlayer doesn't flash away
                          setRemoteControlling(true, currentTrack, isPlaying);
                          transferToWithData(
                            device.socketId,
                            currentTrack,
                            queue,
                            progress,
                            isPlaying,
                            () => {
                              // Transfer failed — reclaim
                              setRemoteControlling(false);
                              toast.error(
                                t('devicePicker.connectFailed', {
                                  device: device.deviceName,
                                }),
                              );
                            },
                            () => {
                              // Transfer succeeded — now safe to stop local
                              stop();
                              toast.success(
                                t('devicePicker.playingOn', {
                                  device: device.deviceName,
                                }),
                              );
                            },
                          );
                        } else {
                          transferTo(device.socketId);
                          toast.success(
                            t('devicePicker.playingOn', {
                              device: device.deviceName,
                            }),
                          );
                        }
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary/10 border border-primary/20'
                          : device.available
                            ? 'hover:bg-accent'
                            : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <DeviceIcon name={device.deviceName} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">
                          {device.deviceName}
                        </p>
                        {!device.available ? (
                          <p className="text-[10px] text-destructive/70">
                            {t('devicePicker.watchingVideo')}
                          </p>
                        ) : isActive ? (
                          <p className="text-[10px] text-primary">
                            {t('devicePicker.listeningOn')}
                          </p>
                        ) : device.isPlaying ? (
                          <p className="text-[10px] text-neo-yellow font-bold">
                            {t('devicePicker.nowPlaying')}
                          </p>
                        ) : null}
                      </div>
                      {(device.isPlaying || isActive) && device.available && (
                        <span className="w-2.5 h-2.5 bg-neo-yellow rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-foreground/40 text-center py-4">
                  {t('devicePicker.noDevices')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
