'use client';

import { Film, Plus, Tv } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import React from 'react';
import type { WatchlistItem } from '@/features/watchlist/types';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useWatchlist } from '../hooks/use-watchlist';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

/**
 * Watchlist view component.
 * Features:
 * - Displays user's saved content for the active server.
 * - Neobrutalist styling consistent with the rest of the app.
 * - Integration with ContentDetailModal.
 */
export function WatchlistClient() {
  const { watchlist, loading, selectedId, setSelectedId, isEmpty, removeItem } =
    useWatchlist();

  return (
    <>
      <div className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-in fade-in flex flex-col">
        {/* Hero Header */}
        <div className="border-b-[4px] border-border mb-12 bg-neo-red relative overflow-hidden shrink-0">
          {/* Abstract background shapes */}
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />

          <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
              <div>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white font-headline uppercase leading-none mb-4 min-w-0">
                  MY
                  <br />
                  <span className="bg-neo-yellow text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                    WATCHLIST
                  </span>
                </h1>
                <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-neo-surface inline-block px-4 py-2 border-[3px] border-border">
                  Your Curated Selection
                </p>
              </div>

              {/* Item Counter */}
              {!loading && (
                <div className="flex flex-wrap gap-3 pb-3 xl:pb-6 h-fit">
                  <span className="text-lg md:text-2xl font-black font-headline uppercase tracking-widest text-foreground bg-neo-surface border-[4px] border-border px-6 py-3 ">
                    {watchlist.length}{' '}
                    {watchlist.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 md:px-10 flex-col flex flex-1">
          {loading ? (
            <div className="flex flex-col gap-6">
              {['wl-sk-1', 'wl-sk-2', 'wl-sk-3', 'wl-sk-4'].map((id) => (
                <div
                  key={id}
                  className="w-full h-40 bg-muted animate-pulse border-[4px] border-border"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 bg-neo-surface border-[4px] border-border  text-center max-w-2xl mx-auto w-full">
              <Plus className="w-20 h-20 text-neo-blue mb-6 stroke-[3px]" />
              <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
                Watchlist is Empty
              </h3>
              <p className="font-headline font-bold uppercase tracking-widest text-neo-muted max-w-sm px-6">
                You haven't saved any films yet. Search for content to add them
                to your private collection.
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col gap-6"
              style={{ contentVisibility: 'auto' }}
            >
              {watchlist.map((item) => (
                <WatchlistItemCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedId(item.contentId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedId ? (
        <ContentDetailModal
          contentId={selectedId}
          onClose={() => setSelectedId(null)}
          onWatchlistChange={(id, inList) => {
            if (!inList) removeItem(id);
          }}
        />
      ) : null}
    </>
  );
}

// --- Helper Components ---

const WatchlistItemCard = React.memo(function WatchlistItemCard({
  item,
  onClick,
}: {
  item: WatchlistItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col w-full sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`View details for ${item.title}`}
    >
      {/* Poster */}
      <div className="w-24 sm:w-28 shrink-0 bg-secondary relative border-r-[3px] border-border hidden sm:block">
        {item.posterUrl ? (
          <Image
            src={getOptimizedImageUrl(item.posterUrl)}
            alt={item.title}
            fill
            sizes="112px"
            className="object-cover"
            unoptimized={item.posterUrl.includes('/api/stream/')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20">
            {item.contentType === 'Series' ? (
              <Tv className="w-8 h-8 stroke-[2px]" />
            ) : (
              <Film className="w-8 h-8 stroke-[2px]" />
            )}
          </div>
        )}
      </div>

      {/* Detail Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 pr-4">
            <h3 className="font-headline font-black uppercase tracking-wide text-base sm:text-xl leading-tight line-clamp-1">
              {item.title}
            </h3>

            {/* Status Text & Speed */}
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase font-bold text-foreground/60 tracking-wider">
              <span className="text-foreground/80 font-black">
                {item.contentType}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
});
