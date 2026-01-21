'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorOverlayProps {
  isVisible: boolean;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorOverlay({
  isVisible,
  message,
  onRetry,
  onBack,
}: ErrorOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 animate-in fade-in duration-300">
      <div className="flex flex-col items-center max-w-md px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          Playback Error
        </h2>
        <p className="text-white/70 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="bg-white text-black hover:bg-white/90 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
