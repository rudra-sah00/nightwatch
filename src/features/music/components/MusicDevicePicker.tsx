'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useMusicDeviceSync } from '../hooks/use-music-device-sync';
import { useMusicStore } from '../store/use-music-store';
import { getDeviceName } from '../utils';

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
 * Spotify Connect-like device picker.
 * All sync logic lives in `useMusicDeviceSync` — this is UI only.
 */
export function MusicDevicePicker() {
  const t = useTranslations('music');
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const queue = useMusicStore((s) => s.queue);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const stop = useMusicStore((s) => s.stop);
  const setRemoteControlling = useMusicStore((s) => s.setRemoteControlling);
  const remoteQueue = useMusicStore((s) => s.remoteQueue);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteProgress = useMusicStore((s) => s.remoteProgress);
  const progress = useMusicStore((s) => s.progress);

  const {
    devices,
    activeTarget,
    remoteState,
    isControlling,
    transferToWithData,
    transferTo,
    sendCommand,
    reclaimPlayback,
    remoteProgressRef,
  } = useMusicDeviceSync();

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

  const handleReclaim = () => {
    const trackToPlay = isControlling ? remoteState.track : remoteTrack;
    const prog = isControlling ? remoteProgressRef.current : remoteProgress;
    const q = isControlling
      ? remoteState.queue.length > 0
        ? remoteState.queue
        : remoteQueue
      : remoteQueue;
    if (isControlling) sendCommand('stop');
    window.dispatchEvent(new CustomEvent('music:reclaim-started'));
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
  };

  const handleTransfer = (
    socketId: string,
    deviceId: string,
    deviceNameLabel: string,
  ) => {
    if (currentTrack) {
      const transferredTrackId = currentTrack.id;
      setRemoteControlling(true, currentTrack, isPlaying);
      transferToWithData(
        socketId,
        currentTrack,
        queue,
        progress,
        isPlaying,
        () => {
          setRemoteControlling(false);
          toast.error(
            t('devicePicker.connectFailed', { device: deviceNameLabel }),
          );
        },
        () => {
          // Only stop if the track hasn't changed during flight
          if (
            useMusicStore.getState().currentTrack?.id === transferredTrackId
          ) {
            stop();
          }
          toast.success(
            t('devicePicker.playingOn', { device: deviceNameLabel }),
          );
        },
        deviceId,
      );
    } else {
      transferTo(socketId, undefined, deviceId);
      toast.success(t('devicePicker.playingOn', { device: deviceNameLabel }));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`p-1.5 transition-colors ${isControlling || isRemoteControlling ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
        title={t('devicePicker.connectToDevice')}
      >
        <ConnectIcon className="w-3.5 h-3.5" />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
            onClick={closeModal}
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

              <div className="flex flex-col items-center gap-2 w-72">
                {/* This device */}
                <button
                  type="button"
                  onClick={() => {
                    if (isControlling || isRemoteControlling) handleReclaim();
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
                          handleTransfer(
                            device.socketId,
                            device.deviceId,
                            device.deviceName,
                          );
                          closeModal();
                        }}
                        className={`w-full flex items-center gap-3 py-2 transition-colors ${device.available ? 'hover:text-white' : 'opacity-40 cursor-not-allowed'}`}
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
                onClick={closeModal}
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
