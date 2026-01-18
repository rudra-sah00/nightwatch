/**
 * Subtitles Settings Panel
 */

import type { LocalSubtitle } from '@/types/video';
import { RadioIndicator, SubMenuHeader } from './shared';

interface SubtitlesPanelProps {
  subtitles: LocalSubtitle[];
  currentIndex: number;
  isMobile?: boolean;
  onBack: () => void;
  onSelect: (index: number) => void;
}

export function SubtitlesPanel({
  subtitles,
  currentIndex,
  isMobile = false,
  onBack,
  onSelect,
}: SubtitlesPanelProps) {
  return (
    <div>
      <SubMenuHeader title="Subtitles / CC" onBack={onBack} isMobile={isMobile} />
      <div
        className={`py-1 sm:py-2 ${isMobile ? 'max-h-[280px]' : 'max-h-[360px]'} overflow-y-auto custom-scrollbar`}
      >
        {/* Off Option */}
        <button
          type="button"
          onClick={() => onSelect(-1)}
          className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
            currentIndex === -1 ? 'bg-white/5' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <RadioIndicator isSelected={currentIndex === -1} />
            <span
              className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentIndex === -1 ? 'text-white' : 'text-white/70'}`}
            >
              Off
            </span>
          </div>
        </button>

        {/* Divider */}
        {subtitles.length > 0 && (
          <div className="mx-3 sm:mx-4 my-1.5 sm:my-2 border-t border-white/10" />
        )}

        {/* Subtitle Options */}
        {subtitles.map((sub, index) => (
          <button
            type="button"
            key={sub.url || `subtitle-${index}`}
            onClick={() => onSelect(index)}
            className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
              currentIndex === index ? 'bg-white/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <RadioIndicator isSelected={currentIndex === index} />
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentIndex === index ? 'text-white' : 'text-white/70'}`}
                >
                  {sub.language}
                </span>
              </div>
            </div>
            <span
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-white/10 text-white/60`}
            >
              CC
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
