'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BufferingOverlayProps {
  isVisible: boolean;
}

export function BufferingOverlay({ isVisible }: BufferingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 rounded-full border-4 border-white/20" />
          <Loader2 className="absolute top-0 left-0 w-16 h-16 text-white animate-spin" />
        </div>
      </div>
    </div>
  );
}
