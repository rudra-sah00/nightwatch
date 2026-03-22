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
      <div className="relative flex items-center justify-center">
        {/* Brutalist Square Loader */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-[#1a1a1a] bg-[#ffcc00] animate-[spin_2s_steps(4)_infinite]" />
          <div className="absolute inset-2 bg-[#e63b2e] border-[3px] border-[#1a1a1a] animate-[spin_2s_steps(4)_infinite_reverse]" />
        </div>
      </div>
    </div>
  );
}
