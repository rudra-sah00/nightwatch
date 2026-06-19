'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MusicTrack } from '../api';
import { useMusicStore } from '../store/use-music-store';
import { showSongMenu } from './SongContextMenu';

interface QueueOverlayProps {
  open: boolean;
  onClose: () => void;
  displayQueue: MusicTrack[];
  displayTrackId?: string;
  isRemoteControlling: boolean;
}

export function QueueOverlay({
  open,
  onClose,
  displayQueue,
  displayTrackId,
  isRemoteControlling,
}: QueueOverlayProps) {
  const queue = useMusicStore((s) => s.queue);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const removeFromQueue = useMusicStore((s) => s.removeFromQueue);
  const play = useMusicStore((s) => s.play);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
  }, [open]);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  if (!open || displayQueue.length === 0) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex flex-col items-center gap-3 w-80 max-h-[60vh] transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <p className="font-headline font-black uppercase tracking-widest text-[10px] text-white/40">
          Queue — {displayQueue.length}
        </p>
        <div className="w-full overflow-y-auto max-h-[50vh] space-y-1">
          {displayQueue.map((track, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: queue has duplicate track IDs
              key={i}
              type="button"
              onClick={() => {
                if (isRemoteControlling) {
                  window.dispatchEvent(
                    new CustomEvent('music:remote-command', {
                      detail: { command: 'play_track', value: track },
                    }),
                  );
                } else {
                  play(track, queue);
                }
                close();
              }}
              onContextMenu={(e) =>
                showSongMenu(
                  e,
                  track,
                  !isRemoteControlling && currentTrack?.id !== track.id
                    ? () => removeFromQueue(i)
                    : undefined,
                )
              }
              className={`w-full flex items-center gap-2 py-1.5 text-left transition-colors hover:text-white ${displayTrackId === track.id ? 'text-neo-yellow' : 'text-white/80'}`}
            >
              <span className="w-4 text-white/20 text-[9px] font-mono text-right shrink-0">
                {i + 1}
              </span>
              <img
                src={track.image}
                alt=""
                className="w-6 h-6 rounded object-cover shrink-0"
              />
              <span className="font-headline font-bold text-[10px] uppercase tracking-wider truncate flex-1">
                {track.title}
              </span>
              <span className="text-white/30 text-[9px] font-mono shrink-0">
                {track.artist}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-white/60 text-xs font-headline uppercase tracking-wider cursor-pointer hover:text-white mt-2"
          onClick={close}
        >
          cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
