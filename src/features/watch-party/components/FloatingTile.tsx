'use client';

import { Mic, MicOff } from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { TileLayout } from '../hooks/use-floating-tiles';
import type { AgoraParticipant } from '../media/hooks/useAgora';

/** Props for the {@link FloatingTile} component. */
interface FloatingTileProps {
  /** The Agora participant whose video/audio to render. */
  participant: AgoraParticipant;
  /** Current position, size, and z-order of this tile. */
  layout: TileLayout;
  /** Ref to the bounding container used to clamp drag/resize within bounds. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Called when a drag gesture ends with the new position (percentage). */
  onDragEnd: (id: string, x: number, y: number) => void;
  /** Called when a resize gesture ends with the new dimensions (pixels). */
  onResizeEnd: (id: string, w: number, h: number) => void;
  /** Called on pointer-down to bring this tile to the front of the stack. */
  onFocus: (id: string) => void;
  /** Minimum allowed tile width in pixels. */
  minW: number;
  /** Minimum allowed tile height in pixels. */
  minH: number;
}

/**
 * Draggable, resizable floating video tile for a single watch party participant.
 *
 * Renders the participant's Agora video track (or an avatar fallback when the
 * camera is off), a speaking indicator ring, a name + mic-status bar, and a
 * corner resize grip. Drag and resize are implemented with raw pointer events
 * for zero-dependency, 60 fps interaction.
 *
 * @param props - {@link FloatingTileProps}
 */
export const FloatingTile = memo(function FloatingTile({
  participant,
  layout,
  containerRef,
  onDragEnd,
  onResizeEnd,
  onFocus,
  minW,
  minH,
}: FloatingTileProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);

  // Attach Agora video track — do NOT stop the track on cleanup since
  // it's shared with the sidebar VideoGrid and owned by Agora.
  useEffect(() => {
    const track = participant.videoTrack;
    const el = videoContainerRef.current;
    if (!track || !el) return;

    track.play(el);

    return () => {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    };
  }, [participant.videoTrack]);

  const displayName =
    participant.name ||
    (participant.identity?.startsWith('guest') ? 'Guest' : 'Member');

  // ── Drag ──────────────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Ignore if clicking the resize handle
      if ((e.target as HTMLElement).dataset.resize) return;
      e.preventDefault();
      e.stopPropagation();
      onFocus(participant.identity);

      const container = containerRef.current;
      const tile = tileRef.current;
      if (!container || !tile) return;

      const cRect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = (layout.x / 100) * cRect.width;
      const startTop = (layout.y / 100) * cRect.height;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newLeft = Math.max(
          0,
          Math.min(startLeft + dx, cRect.width - tile.offsetWidth),
        );
        const newTop = Math.max(
          0,
          Math.min(startTop + dy, cRect.height - tile.offsetHeight),
        );
        tile.style.left = `${newLeft}px`;
        tile.style.top = `${newTop}px`;
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newLeft = Math.max(
          0,
          Math.min(startLeft + dx, cRect.width - tile.offsetWidth),
        );
        const newTop = Math.max(
          0,
          Math.min(startTop + dy, cRect.height - tile.offsetHeight),
        );
        onDragEnd(
          participant.identity,
          (newLeft / cRect.width) * 100,
          (newTop / cRect.height) * 100,
        );
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [
      containerRef,
      layout.x,
      layout.y,
      onDragEnd,
      onFocus,
      participant.identity,
    ],
  );

  // ── Resize ────────────────────────────────────────────────────────────
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onFocus(participant.identity);

      const tile = tileRef.current;
      if (!tile) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = tile.offsetWidth;
      const startH = tile.offsetHeight;

      const onMove = (ev: PointerEvent) => {
        const w = Math.max(minW, startW + (ev.clientX - startX));
        const h = Math.max(minH, startH + (ev.clientY - startY));
        tile.style.width = `${w}px`;
        tile.style.height = `${h}px`;
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const w = Math.max(minW, startW + (ev.clientX - startX));
        const h = Math.max(minH, startH + (ev.clientY - startY));
        onResizeEnd(participant.identity, w, h);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [minW, minH, onFocus, onResizeEnd, participant.identity],
  );

  return (
    <div
      ref={tileRef}
      onPointerDown={handleDragStart}
      className="absolute rounded-xl border-[3px] border-border overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none bg-black"
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
      }}
    >
      {/* Video */}
      <div
        ref={videoContainerRef}
        className={cn(
          'w-full h-full',
          !participant.isCameraEnabled && 'opacity-0',
        )}
      />

      {/* Avatar fallback when camera off */}
      {!participant.isCameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="w-10 h-10 rounded-full bg-neo-blue border-[2px] border-border flex items-center justify-center">
            <span className="text-sm font-black font-headline uppercase text-primary-foreground">
              {displayName.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Speaking ring */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-[9px] ring-2 ring-neo-yellow pointer-events-none" />
      )}

      {/* Bottom bar: name + mic */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <span className="text-[9px] font-black font-headline uppercase tracking-widest text-white truncate">
          {displayName}
        </span>
        {participant.isMicrophoneEnabled ? (
          <Mic className="w-3 h-3 text-white/70 shrink-0" />
        ) : (
          <MicOff className="w-3 h-3 text-neo-red shrink-0" />
        )}
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        data-resize="true"
        onPointerDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
      >
        <svg
          viewBox="0 0 10 10"
          className="w-full h-full text-white/40"
          fill="currentColor"
          role="img"
          aria-label="Resize"
        >
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
        </svg>
      </div>
    </div>
  );
});
