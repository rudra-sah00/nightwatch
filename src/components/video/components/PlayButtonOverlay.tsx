'use client';

import React from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import { Lock } from 'lucide-react';

interface PlayButtonOverlayProps {
  isPlaying: boolean;
  locked?: boolean;
  onTogglePlay: () => void;
}

export function PlayButtonOverlay({ isPlaying, locked = false, onTogglePlay }: PlayButtonOverlayProps) {
  if (isPlaying) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-10 ${
        locked ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={locked ? undefined : onTogglePlay}
    >
      {/* Responsive play button: larger on tablets/laptops */}
      <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 touch-manipulation active:scale-95 ${
        locked 
          ? 'bg-white/50' 
          : 'bg-white/90 hover:bg-white hover:scale-110'
      }`}>
        {locked ? (
          <Lock className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-black/50" />
        ) : (
          <PlayIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-black ml-0.5 sm:ml-1" />
        )}
      </div>
      {locked && (
        <div className="absolute bottom-1/4 sm:bottom-1/3 text-white/80 text-xs sm:text-sm md:text-base font-medium bg-black/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
          Waiting for host to play
        </div>
      )}
    </div>
  );
}
