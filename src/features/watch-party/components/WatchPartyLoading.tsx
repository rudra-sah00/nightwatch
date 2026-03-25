import { cn } from '@/lib/utils';

interface WatchPartyLoadingProps {
  message?: string;
  className?: string;
}

export function WatchPartyLoading({
  message = 'Connecting to watch party…',
  className,
}: WatchPartyLoadingProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center p-6 transition-all duration-500 ease-in-out',
        className,
      )}
    >
      <div className="bg-[#ffcc00] border-[4px] border-[#1a1a1a] neo-shadow px-8 py-6 md:px-12 md:py-8 flex flex-col items-center gap-6 saturate-[1.2] animate-in fade-in zoom-in-95 duration-500">
        {/* Brutalist Square Loader */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-[#1a1a1a] bg-white animate-[spin_2s_steps(4)_infinite]" />
          <div className="absolute inset-2 bg-[#e63b2e] border-[3px] border-[#1a1a1a] animate-[spin_2s_steps(4)_infinite_reverse]" />
        </div>

        {/* Steady Loading Text */}
        <div className="mt-2 flex flex-col items-center gap-3 w-full">
          <span className="text-[#1a1a1a] text-[10px] md:text-sm font-black font-headline tracking-widest uppercase text-center leading-tight max-w-[240px]">
            {message}
          </span>
          <div className="h-[4px] w-full bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}
