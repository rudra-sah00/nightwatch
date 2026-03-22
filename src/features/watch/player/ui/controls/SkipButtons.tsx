'use client';

import { SkipBack, SkipForward } from 'lucide-react';

// Static icons to avoid recreation
const skipBackIcon = (
  <SkipBack className="w-8 h-8 text-[#1a1a1a] stroke-[3px]" />
);
const skipForwardIcon = (
  <SkipForward className="w-8 h-8 text-[#1a1a1a] stroke-[3px]" />
);

interface SkipButtonProps {
  direction: 'back' | 'forward';
  seconds?: number;
  onSkip: () => void;
}

export function SkipButton({
  direction,
  seconds = 10,
  onSkip,
}: SkipButtonProps) {
  const Icon = direction === 'back' ? SkipBack : SkipForward;

  return (
    <button
      type="button"
      onClick={onSkip}
      className="p-2.5 bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#ffe066] active:bg-[#e0e0e0] transition-all duration-200 group relative flex items-center justify-center"
      title={`Skip ${direction === 'back' ? 'back' : 'forward'} ${seconds}s`}
    >
      <Icon className="w-5 h-5 stroke-[3px] -mb-1" />
      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black font-headline text-[#1a1a1a] bg-white border-[2px] border-[#1a1a1a] px-1 group-hover:bg-[#ffe066] transition-colors">
        {seconds}
      </span>
    </button>
  );
}

// Animated skip indicator that shows on seek
interface SeekIndicatorProps {
  seconds: number;
  direction: 'back' | 'forward';
  isVisible: boolean;
}

export function SeekIndicator({
  seconds,
  direction,
  isVisible,
}: SeekIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${direction === 'back' ? 'left-1/4' : 'right-1/4'} 
                        flex flex-col items-center gap-2 animate-in fade-in zoom-in-50 duration-200`}
    >
      <div className="w-16 h-16 bg-white border-[4px] border-[#1a1a1a] flex items-center justify-center neo-shadow">
        {direction === 'back' ? skipBackIcon : skipForwardIcon}
      </div>
      <span className="text-[#1a1a1a] bg-white border-[3px] border-[#1a1a1a] px-3 py-1 font-black font-headline uppercase tracking-widest text-sm neo-shadow-sm">
        {seconds}s
      </span>
    </div>
  );
}
