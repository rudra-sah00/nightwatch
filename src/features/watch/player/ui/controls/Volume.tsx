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
          'p-2.5 transition-all duration-200',
          'bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm',
          'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#ffe066]',
          'active:bg-[#ffcc00]',
        )}
      >
        <VolumeIcon className="w-5 h-5 stroke-[3px]" />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-[width,opacity] duration-200 ease-out flex items-center',
          isHovered || isDragging ? 'w-24 opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div
          ref={sliderRef}
          className={cn(
            'relative h-3 w-24 bg-white border-[2px] border-[#1a1a1a] cursor-pointer',
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
          {/* Volume fill */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#0055ff] border-r-[2px] border-[#1a1a1a]"
            style={{
              width: `${displayVolume * 100}%`,
              transition: isDragging ? 'none' : 'width 50ms ease-out',
            }}
          />

          {/* Slider handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-5 bg-[#ffcc00] border-[2px] border-[#1a1a1a]',
              'transition-transform duration-100',
              isHovered || isDragging ? 'scale-110' : 'scale-100',
            )}
            style={{
              left: `calc(${displayVolume * 100}% - 8px)`,
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
