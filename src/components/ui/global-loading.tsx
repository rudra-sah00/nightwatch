import React from 'react';
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
        'flex flex-col items-center justify-center bg-[#f5f0e8] animate-in fade-in duration-500',
        fullScreen ? 'fixed inset-0 z-[100]' : 'w-full h-full p-8',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Neo-brutalist custom spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-[4px] border-[#1a1a1a] rounded-full" />
          <div className="absolute inset-0 border-[4px] border-transparent border-t-[#ffcc00] rounded-full animate-spin" />
          <div className="absolute inset-2 border-[4px] border-transparent border-b-[#e63b2e] rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
        </div>

        {message && (
          <div className="bg-[#1a1a1a] text-white px-4 py-2 border-[3px] border-[#1a1a1a] neo-shadow-sm">
            <span className="font-headline font-black uppercase text-sm tracking-[0.2em] animate-pulse">
              {message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
