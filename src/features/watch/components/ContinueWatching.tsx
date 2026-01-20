'use client';

import { Clock, Film, Loader2, RotateCcw, Tv, X } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/ws';
import type { WatchProgress } from '../types';

interface ContinueWatchingProps {
  className?: string;
  onSelectContent?: (contentId: string) => void;
  onLoadComplete?: (itemCount: number) => void;
}

interface SocketResponse {
  success: boolean;
  items?: WatchProgress[];
  error?: string;
}

export function ContinueWatching({
  className,
  onSelectContent,
  onLoadComplete,
}: ContinueWatchingProps) {
  // const router = useRouter();
  const [items, setItems] = useState<WatchProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // Fetch continue watching items
  const fetchContinueWatching = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) {
      setIsLoading(false);
      onLoadComplete?.(0);
      return;
    }

    socket.emit('watch:get_continue_watching', { limit: 10 }, (response: SocketResponse) => {
      setIsLoading(false);
      if (response?.success && response.items) {
        setItems(response.items);
        onLoadComplete?.(response.items.length);
      } else {
        // setError(response?.error || 'Failed to load');
        onLoadComplete?.(0);
      }
    });
  }, [onLoadComplete]);

  useEffect(() => {
    const socket = getSocket();

    if (socket?.connected) {
      // Avoid sync state update in effect
      setTimeout(() => fetchContinueWatching(), 0);
    } else if (socket) {
      socket.once('connect', fetchContinueWatching);
    } else {
      // Avoid sync state update in effect
      setTimeout(() => setIsLoading(false), 0);
    }

    // Refresh on window focus
    const handleFocus = () => {
      if (getSocket()?.connected) {
        fetchContinueWatching();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      socket?.off('connect', fetchContinueWatching);
    };
  }, [fetchContinueWatching]);

  // Handle selecting content - opens modal
  const handleSelect = useCallback(
    (item: WatchProgress) => {
      if (onSelectContent) {
        onSelectContent(item.contentId);
      }
    },
    [onSelectContent],
  );

  // Handle removing from continue watching
  const handleRemove = useCallback((item: WatchProgress, e: React.MouseEvent) => {
    e.stopPropagation();
    const socket = getSocket();
    if (!socket?.connected) return;

    // Backend expects progressId (which is item.id)
    socket.emit(
      'watch:delete_progress',
      {
        progressId: item.id,
      },
      (response: SocketResponse) => {
        if (response?.success) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          toast.error('Failed to remove from list');
        }
      },
    );
  }, []);

  // Format remaining time
  const formatRemainingTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  if (isLoading) {
    return (
      <div className={cn('py-6', className)}>
        <h2 className="text-xl font-semibold text-foreground mb-4">Continue Watching</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show section if no items
  }

  return (
    <div className={cn('py-6', className)}>
      <h2 className="text-xl font-semibold text-foreground mb-4">Continue Watching</h2>

      {/* Vertical List items */}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className={cn(
              'group flex items-center gap-4 p-2 rounded-xl cursor-pointer w-full text-left',
              'hover:bg-accent/40 transition-all border border-transparent hover:border-border/50',
            )}
            onClick={() => handleSelect(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelect(item);
              }
            }}
          >
            {/* Thumbnail */}
            <div className="relative w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted shadow-sm">
              {item.posterUrl ? (
                <Image
                  src={item.posterUrl}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                  {item.contentType === 'Series' ? (
                    <Tv className="w-8 h-8 text-muted-foreground/30" />
                  ) : (
                    <Film className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>
              )}

              {/* Progress bar overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                <div
                  className="h-full bg-red-600 transition-all"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>

              {/* Resume overlay - enhanced styling */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm border border-primary/50 shadow-lg">
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium text-white">Resume</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
                    item.contentType === 'Series'
                      ? 'bg-purple-500/10 text-purple-500'
                      : 'bg-blue-500/10 text-blue-500',
                  )}
                >
                  {item.contentType === 'Series' ? 'Series' : 'Movie'}
                </span>
              </div>

              <h3 className="font-semibold text-foreground truncate text-base leading-tight mb-1">
                {item.title}
              </h3>

              <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                {item.contentType === 'Series' && item.seasonNumber && item.episodeNumber && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-foreground/80">
                      S{item.seasonNumber}:E{item.episodeNumber}
                    </span>
                    {item.episodeTitle && (
                      <span className="opacity-60 truncate">• {item.episodeTitle}</span>
                    )}
                  </span>
                )}

                <span className="flex items-center gap-1.5 text-xs opacity-70">
                  <Clock className="w-3 h-3" />
                  {formatRemainingTime(item.remainingMinutes)}
                </span>
              </div>
            </div>

            {/* Remove Action */}
            <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => handleRemove(item, e)}
                className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors tooltip-trigger"
                title="Remove from list"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
