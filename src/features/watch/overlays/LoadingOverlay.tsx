import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { VideoMetadata } from '../player/types';

interface LoadingOverlayProps {
  isVisible: boolean;
  metadata?: VideoMetadata;
}

export function LoadingOverlay({ isVisible, metadata }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-[60] flex items-center justify-center transition-all duration-700 ease-in-out bg-black',
        isVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
      )}
    >
      {/* Background Poster with heavy blur */}
      {metadata?.posterUrl && (
        <div
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <Image
            src={metadata.posterUrl}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-40"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md px-6 text-center">
        {/* Animated Loader */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <Loader2 className="absolute top-0 left-0 w-20 h-20 text-red-600 animate-spin" />
        </div>

        {/* Metadata Display */}
        {metadata && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {metadata.title}
            </h2>

            {(metadata.season || metadata.episode) && (
              <div className="flex items-center justify-center gap-2 text-white/60 font-medium uppercase tracking-widest text-sm">
                {metadata.season && <span>Season {metadata.season}</span>}
                {metadata.season && metadata.episode && (
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                )}
                {metadata.episode && <span>Episode {metadata.episode}</span>}
              </div>
            )}

            {metadata.year && (
              <span className="text-white/40 text-sm font-medium">
                {metadata.year}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 text-white/30 text-xs font-medium uppercase tracking-[0.2em] animate-pulse">
          Establishing Secure Stream
        </div>
      </div>
    </div>
  );
}
