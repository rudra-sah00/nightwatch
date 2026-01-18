/**
 * Quality Settings Panel
 */

import { getQualityLabel } from '@/lib/utils/video-utils';
import type { QualityLevel, QualityValue } from '@/types/video';
import { RadioIndicator, SubMenuHeader } from './shared';

interface QualityPanelProps {
  levels: QualityLevel[];
  currentQuality: QualityValue;
  isAutoQuality?: boolean;
  actualQualityLevel?: number;
  isMobile?: boolean;
  onBack: () => void;
  onSelect: (level: QualityValue) => void;
}

export function QualityPanel({
  levels,
  currentQuality,
  isAutoQuality,
  actualQualityLevel,
  isMobile = false,
  onBack,
  onSelect,
}: QualityPanelProps) {
  return (
    <div>
      <SubMenuHeader title="Video Quality" onBack={onBack} isMobile={isMobile} />
      <div
        className={`py-1 sm:py-2 ${isMobile ? 'max-h-[280px]' : 'max-h-[360px]'} overflow-y-auto custom-scrollbar`}
      >
        {/* Auto Option */}
        <button
          type="button"
          onClick={() => onSelect('auto')}
          className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
            currentQuality === 'auto' ? 'bg-white/5' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <RadioIndicator isSelected={currentQuality === 'auto'} />
            <div className="flex flex-col items-start">
              <span
                className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentQuality === 'auto' ? 'text-white' : 'text-white/70'}`}
              >
                Auto
              </span>
              {isAutoQuality && actualQualityLevel !== undefined && actualQualityLevel >= 0 && (
                <span className="text-[10px] sm:text-xs text-blue-400 mt-0.5">
                  Currently:{' '}
                  {getQualityLabel(levels.find((l) => l.id === actualQualityLevel) || levels[0])}
                </span>
              )}
            </div>
          </div>
          <span
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-blue-500/20 text-blue-400`}
          >
            RECOMMENDED
          </span>
        </button>

        {/* Divider */}
        <div className="mx-3 sm:mx-4 my-1.5 sm:my-2 border-t border-white/10" />

        {/* Quality Levels */}
        {levels.map((lvl) => {
          const label = getQualityLabel(lvl);
          const isHD = (lvl.height || 0) >= 720;
          const is4K = (lvl.height || 0) >= 2160;
          const is1080 = (lvl.height || 0) >= 1080;

          return (
            <button
              type="button"
              key={lvl.id}
              onClick={() => onSelect(lvl.id)}
              className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 ${
                currentQuality === lvl.id ? 'bg-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <RadioIndicator isSelected={currentQuality === lvl.id} />
                <span
                  className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${currentQuality === lvl.id ? 'text-white' : 'text-white/70'}`}
                >
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {is4K && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-400 border border-yellow-500/30`}
                  >
                    4K UHD
                  </span>
                )}
                {is1080 && !is4K && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-green-500/20 text-green-400`}
                  >
                    FHD
                  </span>
                )}
                {isHD && !is1080 && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 ${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold rounded-md bg-green-500/20 text-green-400`}
                  >
                    HD
                  </span>
                )}
                {lvl.bitrate && (
                  <span className="text-xs text-white/40 font-mono">
                    {lvl.bitrate >= 1000000
                      ? `${(lvl.bitrate / 1000000).toFixed(1)}Mbps`
                      : `${Math.round(lvl.bitrate / 1000)}kbps`}
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
