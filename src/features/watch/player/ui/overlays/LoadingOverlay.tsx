import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  text?: string;
  bgOpacity?: string;
  isVisible: boolean;
}

export function LoadingOverlay({
  isVisible,
  text,
  bgOpacity,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        `absolute inset-0 z-40 ${bgOpacity || 'bg-black/80'} flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out`,
        isVisible
          ? 'opacity-100 pointer-events-none'
          : 'opacity-0 pointer-events-none',
      )}
      role="status"
      aria-live="polite"
      aria-label={text || 'Initializing secure connection'}
      aria-hidden={!isVisible}
    >
      <div className="flex flex-col items-center gap-6 saturate-[1.2] max-w-[calc(100vw-2rem)] md:max-w-none">
        {/* Simple Circular Spinner */}
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-primary animate-spin" />

        {/* Steady Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-white text-xs min-[380px]:text-sm md:text-base font-medium tracking-wide text-center">
            {text || 'Initializing secure connection'}
          </span>
        </div>
      </div>
    </div>
  );
}
