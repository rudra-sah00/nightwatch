'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-black/60 z-30 transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {/* Center the loading spinner using absolute positioning */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-white/20" />
          <Loader2 className="absolute inset-0 w-16 h-16 text-white animate-spin" />
        </div>
        <p className="text-white/80 text-sm font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
