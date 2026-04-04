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
      role="status"
      aria-live="polite"
      aria-label="Initializing secure connection"
      aria-hidden={!isVisible}
    >
      <div className="bg-[#ffcc00] border-[4px] border-border px-4 py-3 min-[380px]:px-5 min-[380px]:py-4 md:px-12 md:py-8 flex flex-col items-center gap-3 min-[380px]:gap-4 md:gap-6 saturate-[1.2] max-w-[calc(100vw-2rem)] md:max-w-none">
        {/* Brutalist Square Loader */}
        <div className="relative w-10 h-10 min-[380px]:w-11 min-[380px]:h-11 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-border bg-white animate-[spin_2s_steps(4)_infinite] motion-reduce:animate-none" />
          <div className="absolute inset-2 bg-[#e63b2e] border-[3px] border-border animate-[spin_2s_steps(4)_infinite_reverse] motion-reduce:animate-none" />
        </div>

        {/* Steady Loading Text */}
        <div className="mt-2 min-[380px]:mt-3 md:mt-4 flex flex-col items-center gap-2 min-[380px]:gap-3">
          <span className="text-foreground text-[9px] min-[380px]:text-[10px] md:text-sm font-black font-headline tracking-[0.16em] uppercase text-center leading-tight max-w-[170px] min-[380px]:max-w-[190px] md:max-w-[240px]">
            Initializing secure connection
          </span>
          <div className="h-[4px] w-full bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}
