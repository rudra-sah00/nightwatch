/**
 * Settings Menu Panel Components
 * Shared components for settings menu sub-panels
 */

import type React from 'react';
import type { PlaybackSpeed } from '@/types/video';

// Playback speed options
export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Shared sub-menu header
interface SubMenuHeaderProps {
  title: string;
  onBack: () => void;
  isMobile?: boolean;
}

export function SubMenuHeader({ title, onBack, isMobile = false }: SubMenuHeaderProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`w-full flex items-center gap-2 sm:gap-3 ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} bg-white/5 border-b border-white/10 hover:bg-white/8 transition-colors`}
    >
      <ChevronLeftIcon />
      <span className={`text-white font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {title}
      </span>
    </button>
  );
}

// Radio selection indicator
export function RadioIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
        isSelected ? 'border-white bg-white' : 'border-white/30 hover:border-white/50'
      }`}
    >
      {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
    </div>
  );
}

// Menu row for main settings
interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: 'blue' | 'red' | 'green' | 'purple' | 'yellow';
  isMobile?: boolean;
  onClick: () => void;
}

export function MenuRow({
  icon,
  label,
  value,
  badge,
  badgeColor = 'blue',
  isMobile = false,
  onClick,
}: MenuRowProps) {
  const badgeStyles = {
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-white/20 text-white',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'} hover:bg-white/8 active:bg-white/12 transition-all duration-150 group`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-white/50 group-hover:text-white/70 transition-colors">{icon}</span>
        <span className={`text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {badge && (
          <span
            className={`px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-md ${badgeStyles[badgeColor]}`}
          >
            {badge}
          </span>
        )}
        <span
          className={`text-white/50 ${isMobile ? 'text-xs max-w-[80px]' : 'text-sm max-w-[120px]'} truncate group-hover:text-white/70 transition-colors`}
        >
          {value}
        </span>
        <ChevronRightIcon />
      </div>
    </button>
  );
}

// Icons
export function QualityIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="7"
        fill="currentColor"
        stroke="none"
        fontWeight="bold"
      >
        HD
      </text>
    </svg>
  );
}

export function SpeedIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SubtitleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 12h4" strokeLinecap="round" />
      <path d="M14 12h4" strokeLinecap="round" />
      <path d="M6 16h12" strokeLinecap="round" />
    </svg>
  );
}

export function AudioIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v18" strokeLinecap="round" />
      <path d="M8 8v8" strokeLinecap="round" />
      <path d="M16 6v12" strokeLinecap="round" />
      <path d="M4 11v2" strokeLinecap="round" />
      <path d="M20 10v4" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4 text-white/40"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4 text-white/70"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
