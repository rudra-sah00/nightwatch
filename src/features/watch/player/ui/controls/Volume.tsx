'use client';

import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useVolume } from './hooks/use-volume';

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
  const t = useTranslations('watch.player');

  // Determine which volume icon to show
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const displayVolume = isMuted ? 0 : volume;

  return (
    <fieldset
      className="flex items-center gap-2 group border-none p-0 m-0 min-w-0"
      aria-label={t('volumeControl')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={(e) => {
        // Only collapse if focus leaves the entire fieldset
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          !isDragging && setIsHovered(false);
        }
      }}
    >
      <button
        type="button"
        onClick={onMuteToggle}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={isMuted || volume === 0 ? t('unmute') : t('mute')}
        className={cn(
          'p-1.5 md:p-2.5 transition-[background-color,color,border-color,opacity,transform] duration-200',
          'bg-background border-[2px] md:border-[3px] border-border text-foreground ',
          'hover:bg-neo-yellow/80',
          'active:bg-neo-yellow',
        )}
      >
        <VolumeIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
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
            'relative h-3 w-24 bg-background border-[2px] border-border cursor-pointer',
          )}
          onMouseDown={handleMouseDown}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayVolume * 100)}
          aria-label={t('volume')}
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
            className="absolute top-0 bottom-0 left-0 bg-neo-blue border-r-[2px] border-border"
            style={{
              width: `${displayVolume * 100}%`,
              transition: isDragging ? 'none' : 'width 50ms ease-out',
            }}
          />

          {/* Slider handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-5 bg-neo-yellow border-[2px] border-border',
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
