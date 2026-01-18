'use client';

/**
 * Continue Watching Section - Netflix-style
 * Shows recently watched content with progress bars
 * Clicking opens modal, then user can resume from there
 */

import { Play, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui';
import {
  type ContinueWatchingItem,
  formatRemainingTime,
  getContinueWatching,
  removeFromContinueWatching,
} from '@/services/api/watchProgress';

interface ContinueWatchingSectionProps {
  className?: string;
  onOpenModal?: (item: ContinueWatchingItem) => void;
  initialItems?: ContinueWatchingItem[];
}

export function ContinueWatchingSection({
  className = '',
  onOpenModal,
  initialItems,
}: ContinueWatchingSectionProps) {
  const [items, setItems] = useState<ContinueWatchingItem[]>(initialItems || []);
  const [loading, setLoading] = useState(!initialItems);

  const fetchContinueWatching = useCallback(async () => {
    if (initialItems) return;

    try {
      const response = await getContinueWatching(20);
      setItems(response.items);
    } catch (err) {
      console.warn('Failed to fetch continue watching:', err);
    } finally {
      setLoading(false);
    }
  }, [initialItems]);

  useEffect(() => {
    fetchContinueWatching();
  }, [fetchContinueWatching]);

  const handleClick = (item: ContinueWatchingItem) => {
    if (onOpenModal) {
      onOpenModal(item);
    }
  };

  const handleRemove = async (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    try {
      await removeFromContinueWatching(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.warn('Failed to remove item:', err);
    }
  };

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className={`${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Continue Watching
        </h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 bg-zinc-900/50 rounded-lg">
              <Skeleton className="w-36 aspect-video rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-500">
          {items.map((item) => (
            <ContinueWatchingListItem
              key={item.id}
              item={item}
              onClick={() => handleClick(item)}
              onRemove={(e) => handleRemove(e, item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ContinueWatchingListItemProps {
  item: ContinueWatchingItem;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function ContinueWatchingListItem({ item, onClick, onRemove }: ContinueWatchingListItemProps) {
  const progressPercent = Math.min(item.progress_percent, 100);

  // Build display title
  const displayTitle =
    item.content_type === 'Series' && item.episode_title ? `${item.title}` : item.title;

  const episodeInfo =
    item.content_type === 'Series' && item.season_number && item.episode_number
      ? `S${item.season_number}:E${item.episode_number}`
      : null;

  const episodeTitle =
    item.content_type === 'Series' && item.episode_title ? item.episode_title : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-900/60 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/5 text-left"
    >
      {/* Thumbnail */}
      <div className="relative w-40 sm:w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
        {item.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <span className="text-xl font-bold text-zinc-700">
              {item.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/50 backdrop-blur-sm">
          <div
            className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-zinc-200 transition-colors">
              {displayTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
              {episodeInfo && <span className="font-medium text-zinc-300">{episodeInfo}</span>}
              {episodeTitle && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{episodeTitle}</span>
                </>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              {formatRemainingTime(item.remaining_seconds)}
            </p>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={onRemove}
            className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Remove from continue watching"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </button>
  );
}

export default ContinueWatchingSection;
