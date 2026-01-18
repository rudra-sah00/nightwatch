/**
 * Playback Speed Settings Panel
 */

import type { PlaybackSpeed } from '@/types/video';
import { PLAYBACK_SPEEDS, RadioIndicator, SubMenuHeader } from './shared';

interface SpeedPanelProps {
  currentSpeed: number;
  isMobile?: boolean;
  onBack: () => void;
  onSelect: (speed: PlaybackSpeed) => void;
}

export function SpeedPanel({ currentSpeed, isMobile = false, onBack, onSelect }: SpeedPanelProps) {
  return (
    <div>
      <SubMenuHeader title="Playback Speed" onBack={onBack} isMobile={isMobile} />
      <div
        className={`py-1 sm:py-2 ${isMobile ? 'max-h-[280px]' : 'max-h-[360px]'} overflow-y-auto custom-scrollbar`}
      >
        {PLAYBACK_SPEEDS.map((speed) => {
          const isNormal = speed === 1;
          const isSlow = speed < 1;

          return (
            <button
              type="button"
              key={speed}
              onClick={() => onSelect(speed)}
              className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
                currentSpeed === speed ? 'bg-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <RadioIndicator isSelected={currentSpeed === speed} />
                <span
                  className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentSpeed === speed ? 'text-white' : 'text-white/70'}`}
                >
                  {isNormal ? 'Normal' : `${speed}x`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {isNormal && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-green-500/20 text-green-400`}
                  >
                    DEFAULT
                  </span>
                )}
                {isSlow && (
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/40`}>
                    Slower
                  </span>
                )}
                {speed > 1 && (
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/40`}>
                    Faster
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
