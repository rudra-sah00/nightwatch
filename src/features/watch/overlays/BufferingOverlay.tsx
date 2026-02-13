import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BufferingOverlayProps {
  isVisible: boolean;
}

export function BufferingOverlay({ isVisible }: BufferingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="relative flex items-center justify-center scale-75">
        {/* Simple Red Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <Loader2 className="absolute top-0 left-0 w-16 h-16 text-red-600 animate-spin" />
        </div>
      </div>
    </div>
  );
}
