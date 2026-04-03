'use client';

import { Film, Plus, Tv } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SearchSkeleton } from '@/components/ui/skeletons';
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
        <div className="border-b-[4px] border-border mb-12 bg-[#e63b2e] relative overflow-hidden shrink-0">
          {/* Abstract background shapes */}
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-[#ffcc00] border-[4px] border-border opacity-30 rotate-12" />

          <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
              <div>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white font-headline uppercase leading-none mb-4 min-w-0">
                  MY
                  <br />
                  <span className="bg-[#ffcc00] text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                    WATCHLIST
                  </span>
                </h1>
                <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-white inline-block px-4 py-2 border-[3px] border-border">
                  Your Curated Selection
                </p>
              </div>

              {/* Item Counter */}
              {!loading && (
                <div className="flex flex-wrap gap-3 pb-3 xl:pb-6 h-fit">
                  <span className="text-lg md:text-2xl font-black font-headline uppercase tracking-widest text-foreground bg-white border-[4px] border-border px-6 py-3 ">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {['wl-sk-1', 'wl-sk-2', 'wl-sk-3', 'wl-sk-4'].map((id) => (
                <SearchSkeleton key={id} />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border-[4px] border-border  text-center max-w-2xl mx-auto w-full">
              <Plus className="w-20 h-20 text-[#0055ff] mb-6 stroke-[3px]" />
              <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
                Watchlist is Empty
              </h3>
              <p className="font-headline font-bold uppercase tracking-widest text-[#4a4a4a] max-w-sm px-6">
                You haven't saved any films yet. Search for content to add them
                to your private collection.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
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
    <Card className="p-2">
      {/* Aspect Ratio Box wrapped in a button for keyboard accessibility */}
      <button
        type="button"
        className="group aspect-[2/3] border-[3px] border-border overflow-hidden relative mb-4 flex-shrink-0 bg-background cursor-pointer w-full p-0"
        onClick={onClick}
        aria-label={`View details for ${item.title}`}
      >
        {item.posterUrl ? (
          <Image
            src={getOptimizedImageUrl(item.posterUrl)}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-[filter] duration-300"
            unoptimized={item.posterUrl.includes('/api/stream/')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            {item.contentType === 'Series' ? (
              <Tv className="w-12 h-12 text-foreground/20 stroke-[3px]" />
            ) : (
              <Film className="w-12 h-12 text-foreground/20 stroke-[3px]" />
            )}
          </div>
        )}

        {/* Type Badge Overlay */}
        <div className="absolute top-4 left-4 bg-white border-[3px] border-border px-3 py-1 font-headline font-black uppercase text-xs tracking-widest text-foreground ">
          {item.contentType}
        </div>
      </button>

      <CardContent className="px-1 pb-1">
        <button
          type="button"
          onClick={onClick}
          className="text-left font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mt-auto text-foreground hover:text-[#0055ff] transition-colors line-clamp-2"
        >
          {item.title}
        </button>
      </CardContent>
    </Card>
  );
});
