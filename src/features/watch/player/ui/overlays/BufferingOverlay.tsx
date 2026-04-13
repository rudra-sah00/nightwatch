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
      role="status"
      aria-live="polite"
      aria-label="Buffering video"
      aria-hidden={!isVisible}
    >
      <div className="relative flex items-center justify-center">
        {/* Brutalist Square Loader */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-border bg-neo-yellow animate-[spin_2s_steps(4)_infinite] motion-reduce:animate-none" />
          <div className="absolute inset-2 bg-neo-red border-[3px] border-border animate-[spin_2s_steps(4)_infinite_reverse] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
