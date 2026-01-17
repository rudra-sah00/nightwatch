'use client';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message = 'Loading video...' }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Loader */}
        <div className="relative w-20 h-20">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />

          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />

          {/* Inner pulsing circle */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/20 to-white/5 animate-pulse" />

          {/* Center play icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white/80 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <title>Loading</title>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Loading text with shimmer effect */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-white/90 animate-pulse">{message}</p>

          {/* Animated dots */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>

        {/* Progress bar shimmer */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Add shimmer animation style */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
