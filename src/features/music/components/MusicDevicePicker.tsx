'use client';

import {
  Monitor,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Smartphone,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { useMusicDevices } from '../hooks/use-music-devices';
import { formatTime } from '../utils';

/** Routes where music playback is blocked. */
const BLOCKED_ROUTES = ['/watch/', '/live/', '/watch-party/'];

function getDeviceName(): string {
  if (checkIsDesktop()) return 'Desktop App';
  if (checkIsMobile()) return 'Mobile';
  return 'Web Player';
}

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
  const player = useMusicPlayerContext();
  const {
    currentTrack,
    queue,
    progress,
    duration,
    isPlaying,
    play,
    seek,
    stop,
    next,
    prev,
    togglePlay,
    setRemoteControlling,
  } = player;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const deviceName = getDeviceName();
  const isAvailable = !BLOCKED_ROUTES.some((r) => pathname.startsWith(r));

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
  } = useMusicDevices(
    deviceName,
    isPlaying,
    isAvailable,
    currentTrack,
    progress,
    duration,
  );

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
      }
    });
  }, [setOnCommand, togglePlay, next, prev, seek]);

  // Handle incoming transfer (when this device receives playback)
  useEffect(() => {
    setOnTransfer((data) => {
      if (!isAvailable) return;
      play(data.track, data.queue);
      setTimeout(() => {
        seek(data.progress);
        if (!data.isPlaying) togglePlay();
      }, 500);
      toast.success('Playback transferred here');
    });
  }, [setOnTransfer, play, seek, togglePlay, isAvailable]);

  // Forward new local plays to target
  const prevTrackIdRef = useRef(currentTrack?.id);
  useEffect(() => {
    if (!activeTarget || !currentTrack) return;
    if (prevTrackIdRef.current !== currentTrack.id) {
      prevTrackIdRef.current = currentTrack.id;
      transferToWithData(activeTarget, currentTrack, queue, 0, true);
      stop();
    }
  }, [
    currentTrack?.id,
    activeTarget,
    currentTrack,
    queue,
    transferToWithData,
    stop,
  ]);

  // Target went offline
  useEffect(() => {
    if (activeTarget && !devices.find((d) => d.socketId === activeTarget)) {
      reclaimPlayback();
      setRemoteControlling(false);
      toast.info('Device disconnected — playing here');
    }
  }, [devices, activeTarget, reclaimPlayback, setRemoteControlling]);

  const isControlling = !!activeTarget;
  const displayTrack = isControlling ? remoteState.track : currentTrack;
  const displayPlaying = isControlling ? remoteState.isPlaying : isPlaying;

  // Sync remote state to context so MiniPlayer can show it
  useEffect(() => {
    setRemoteControlling(
      isControlling,
      remoteState.track,
      remoteState.isPlaying,
    );
  }, [
    isControlling,
    remoteState.track,
    remoteState.isPlaying,
    setRemoteControlling,
  ]);

  return (
    <>
      {/* Trigger button in MiniPlayer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`p-1.5 transition-colors ${isControlling ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
        title="Connect to a device"
      >
        <ConnectIcon className="w-3.5 h-3.5" />
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="w-[340px] max-w-[90vw] bg-card border-2 border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <ConnectIcon className="w-4 h-4 text-neo-yellow" />
                <h3 className="text-sm font-bold font-headline uppercase tracking-wider">
                  Connect
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

            {/* Now playing on target (if controlling) */}
            {isControlling && displayTrack && (
              <div className="mx-5 mb-4 p-3 rounded-lg bg-neo-yellow/10 border border-neo-yellow/20">
                <div className="flex items-center gap-3">
                  <img
                    src={displayTrack.image}
                    alt=""
                    className="w-10 h-10 rounded border border-border object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">
                      {displayTrack.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {displayTrack.artist}
                    </p>
                  </div>
                </div>
                {/* Remote controls */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => sendCommand('prev')}
                    className="p-1.5 text-foreground/60 hover:text-foreground"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCommand('toggle_play')}
                    className="w-8 h-8 flex items-center justify-center bg-neo-yellow border-2 border-border rounded-full"
                  >
                    {displayPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCommand('next')}
                    className="p-1.5 text-foreground/60 hover:text-foreground"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                </div>
                {/* Progress */}
                {remoteState.duration > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {formatTime(remoteState.progress)}
                    </span>
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-yellow rounded-full transition-all duration-1000"
                        style={{
                          width: `${(remoteState.progress / remoteState.duration) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {formatTime(remoteState.duration)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Device list */}
            <div className="px-3 pb-4 space-y-1">
              {/* This device */}
              <button
                type="button"
                onClick={() => {
                  if (isControlling) {
                    reclaimPlayback();
                    setRemoteControlling(false);
                    toast.success('Playing on this device');
                  }
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  !isControlling
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent'
                }`}
              >
                <DeviceIcon name={deviceName} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium">{deviceName}</p>
                  {!isControlling && (
                    <p className="text-[10px] text-primary">Listening on</p>
                  )}
                </div>
                {!isControlling && isPlaying && (
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
                          );
                          stop();
                        } else {
                          transferTo(device.socketId);
                        }
                        toast.success(`Playing on ${device.deviceName}`);
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
                            Watching video
                          </p>
                        ) : isActive ? (
                          <p className="text-[10px] text-primary">
                            Listening on
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
                  No other devices found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
