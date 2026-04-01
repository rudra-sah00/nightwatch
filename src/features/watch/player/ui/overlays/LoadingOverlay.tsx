import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="bg-[#ffcc00] border-[4px] border-border  px-8 py-6 md:px-12 md:py-8 flex flex-col items-center gap-6 saturate-[1.2]">
        {/* Brutalist Square Loader */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-border bg-white animate-[spin_2s_steps(4)_infinite]" />
          <div className="absolute inset-2 bg-[#e63b2e] border-[3px] border-border animate-[spin_2s_steps(4)_infinite_reverse]" />
        </div>

        {/* Steady Loading Text */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <span className="text-foreground text-[10px] md:text-sm font-black font-headline tracking-widest uppercase text-center leading-tight max-w-[200px]">
            Initializing secure connection
          </span>
          <div className="h-[4px] w-full bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}
