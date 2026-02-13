import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center transition-all duration-700 ease-in-out',
        isVisible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-95 pointer-events-none',
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Single Proper Red Spinner */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          {/* Static Track */}
          <div className="absolute inset-0 rounded-full border-[2px] border-white/5" />

          {/* Active Red Spinner Segment */}
          <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-red-600 animate-[spin_0.8s_linear_infinite]" />
        </div>
      </div>

      {/* Steady Loading Text */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="text-white/60 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
          Initializing secure connection...
        </span>
        <div className="h-[1px] w-12 bg-red-600/30" />
      </div>
    </div>
  );
}
