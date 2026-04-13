import { cn } from '@/lib/utils';

interface GlobalLoadingProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
}

export function GlobalLoading({
  className,
  message = 'LOADING...',
  fullScreen = true,
}: GlobalLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-background motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-reduce:animate-none',
        fullScreen ? 'fixed inset-0 z-[100]' : 'w-full h-full p-8',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Neo-brutalist custom spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-[4px] border-border rounded-full" />
          <div className="absolute inset-0 border-[4px] border-transparent border-t-neo-yellow rounded-full animate-spin motion-reduce:animate-none" />
          <div className="absolute inset-2 border-[4px] border-transparent border-b-neo-red rounded-full animate-[spin_1.5s_linear_infinite_reverse] motion-reduce:animate-none" />
        </div>

        {message && (
          <div className="bg-primary text-primary-foreground px-4 py-2 border-[3px] border-border ">
            <span className="font-headline font-black uppercase text-sm tracking-[0.2em] animate-pulse motion-reduce:animate-none">
              {message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
