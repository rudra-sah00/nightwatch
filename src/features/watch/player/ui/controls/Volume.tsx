'use client';

import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVolume } from './use-volume';

interface VolumeProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export function Volume({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
}: VolumeProps) {
  const { isHovered, setIsHovered, isDragging, sliderRef, handleMouseDown } =
    useVolume({ onVolumeChange });

  // Determine which volume icon to show
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const displayVolume = isMuted ? 0 : volume;

  return (
    <fieldset
      className="flex items-center gap-2 group border-none p-0 m-0 min-w-0"
      aria-label="Volume control"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onMuteToggle}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          'p-3 rounded-full',
          'transition-[colors,transform] duration-200 ease-out',
          'bg-white/5 backdrop-blur-sm border border-white/10',
          'hover:bg-white/15 hover:border-white/20 hover:scale-105',
          'active:scale-95 active:bg-white/20',
          'shadow-lg shadow-black/20',
        )}
      >
        <VolumeIcon className="w-5 h-5 text-white drop-shadow-sm" />
      </button>

      {/* Slider - expands on hover with smooth styling */}
      <div
        className={cn(
          'overflow-hidden transition-[width,opacity] duration-200 ease-out',
          isHovered || isDragging ? 'w-24 opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div
          ref={sliderRef}
          className={cn(
            'relative h-1 w-24 bg-white/15 rounded-full cursor-pointer',
            'transition-colors duration-100',
          )}
          onMouseDown={handleMouseDown}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayVolume * 100)}
          aria-label="Volume"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onVolumeChange(Math.min(1, volume + 0.1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onVolumeChange(Math.max(0, volume - 0.1));
            }
          }}
        >
          {/* Track background glow */}
          <div className="absolute inset-0 rounded-full bg-white/5" />

          {/* Volume fill - no transition for instant response */}
          <div
            className="absolute h-full rounded-full bg-white"
            style={{
              width: `${displayVolume * 100}%`,
              transition: isDragging ? 'none' : 'width 50ms ease-out',
            }}
          />

          {/* Slider handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full',
              'shadow-md shadow-black/30',
              'transition-transform duration-100',
              (isHovered || isDragging) && 'scale-110',
            )}
            style={{
              left: `calc(${displayVolume * 100}% - 6px)`,
              transition: isDragging
                ? 'transform 100ms'
                : 'left 50ms ease-out, transform 100ms',
            }}
          />
        </div>
      </div>
    </fieldset>
  );
}
