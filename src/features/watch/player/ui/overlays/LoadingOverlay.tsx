import { ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out',
        isVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
      )}
      role="status"
      aria-live="polite"
      aria-label="Initializing secure connection"
      aria-hidden={!isVisible}
    >
      <div className="flex flex-col items-center gap-6 saturate-[1.2] max-w-[calc(100vw-2rem)] md:max-w-none">
        {/* Simple Circular Spinner */}
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-primary animate-spin" />

        {/* Steady Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-white text-xs min-[380px]:text-sm md:text-base font-medium tracking-wide text-center">
            Initializing secure connection
          </span>
        </div>

        {/* Back Button */}
        <Button
          variant="neo-outline"
          className="mt-4 bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 px-6 rounded-full"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
