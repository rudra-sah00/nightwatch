'use client';

import { Monitor, Smartphone, Speaker, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { useMusicDevices } from '../hooks/use-music-devices';

function getDeviceName(): string {
  if (checkIsDesktop()) return 'Desktop App';
  if (checkIsMobile()) return 'Mobile';
  return 'Browser';
}

function DeviceIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('mobile')) return <Smartphone className="w-4 h-4" />;
  if (lower.includes('desktop')) return <Monitor className="w-4 h-4" />;
  return <Speaker className="w-4 h-4" />;
}

/**
 * Device picker button + popover for the MiniPlayer.
 * Shows online devices and allows transferring playback (like Spotify Connect).
 */
export function MusicDevicePicker() {
  const { currentTrack, queue, progress, isPlaying, play, seek, togglePlay } =
    useMusicPlayerContext();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const deviceName = getDeviceName();
  const { devices, transferTo, onTransfer } = useMusicDevices(
    deviceName,
    isPlaying,
  );

  // Listen for incoming transfer requests
  useEffect(() => {
    const unsub = onTransfer((data) => {
      if (data.track) {
        play(
          data.track as Parameters<typeof play>[0],
          data.queue as Parameters<typeof play>[1],
        );
        // Seek to the transferred position after a short delay for load
        setTimeout(() => {
          seek(data.progress);
          if (!data.isPlaying) {
            togglePlay();
          }
        }, 500);
        toast.success('Playback transferred to this device');
      }
    });
    return unsub;
  }, [onTransfer, play, seek, togglePlay]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Don't show if no other devices
  if (devices.length === 0) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 transition-colors ${open ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
        title="Devices"
      >
        <Volume2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-card border-2 border-border rounded-lg shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          <p className="text-[9px] font-headline font-black uppercase tracking-widest text-foreground/30 px-2 py-1">
            Devices
          </p>

          {/* This device */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-primary/10 border border-primary/20">
            <DeviceIcon name={deviceName} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{deviceName}</p>
              <p className="text-[10px] text-primary">This device</p>
            </div>
            {isPlaying && (
              <span className="w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
            )}
          </div>

          {/* Other devices */}
          {devices.map((device) => (
            <button
              key={device.socketId}
              type="button"
              onClick={() => {
                if (!currentTrack) return;
                transferTo(
                  device.socketId,
                  currentTrack,
                  queue,
                  progress,
                  isPlaying,
                );
                toast.success(`Playing on ${device.deviceName}`);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent transition-colors mt-1"
            >
              <DeviceIcon name={device.deviceName} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate">
                  {device.deviceName}
                </p>
              </div>
              {device.isPlaying && (
                <span className="w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
