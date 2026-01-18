/**
 * Audio Settings Panel
 */

import type { PlayerAudioTrack } from '@/types/video';
import { RadioIndicator, SubMenuHeader } from './shared';

interface AudioPanelProps {
  tracks: PlayerAudioTrack[];
  currentTrack: number;
  isMobile?: boolean;
  onBack: () => void;
  onSelect: (trackId: number) => void;
}

export function AudioPanel({
  tracks,
  currentTrack,
  isMobile = false,
  onBack,
  onSelect,
}: AudioPanelProps) {
  return (
    <div>
      <SubMenuHeader title="Audio Track" onBack={onBack} isMobile={isMobile} />
      <div
        className={`py-1 sm:py-2 ${isMobile ? 'max-h-[280px]' : 'max-h-[360px]'} overflow-y-auto custom-scrollbar`}
      >
        {tracks.map((track) => (
          <button
            type="button"
            key={track.id}
            onClick={() => onSelect(track.id)}
            className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
              currentTrack === track.id ? 'bg-white/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <RadioIndicator isSelected={currentTrack === track.id} />
              <div className="flex flex-col items-start">
                <span
                  className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentTrack === track.id ? 'text-white' : 'text-white/70'}`}
                >
                  {track.name}
                </span>
                {track.lang !== 'unknown' && (
                  <span
                    className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/40 uppercase mt-0.5`}
                  >
                    {track.lang}
                  </span>
                )}
              </div>
            </div>
            {currentTrack === track.id && (
              <span
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-green-500/20 text-green-400`}
              >
                ACTIVE
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
