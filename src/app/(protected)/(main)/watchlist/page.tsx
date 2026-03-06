'use client';

import { Film, Loader2, Tv } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ContentDetailModal } from '@/features/search/components/content-detail-modal';
import type { WatchlistItem } from '@/features/watchlist/types';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useWatchlistPage } from './use-watchlist-page';

export default function WatchlistPage() {
  const {
    serverLabel,
    watchlist,
    loading,
    selectedId,
    setSelectedId,
    isEmpty,
  } = useWatchlistPage();

  return (
    <>
      <div className="container mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Watchlist</h1>
          </div>
          {!loading && (
            <span className="text-muted-foreground">
              {watchlist.length} {watchlist.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <EmptyWatchlist serverLabel={serverLabel} />
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
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

      {selectedId ? (
        <ContentDetailModal
          contentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}

// --- Helper Components ---

const EmptyWatchlist = React.memo(function EmptyWatchlist({
  serverLabel,
}: {
  serverLabel: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
        <div className="p-4 rounded-full bg-white/10">
          <Film className="w-8 h-8 opacity-50" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No items on {serverLabel}</h3>
          <p className="text-muted-foreground">
            Add movies or shows while browsing on {serverLabel} and they'll
            appear here.
          </p>
        </div>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/">Browse Content</Link>
        </Button>
      </div>
    </div>
  );
});

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
      className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 transition-[colors,transform,shadow] hover:scale-105 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 cursor-pointer text-left"
      onClick={onClick}
    >
      {item.posterUrl ? (
        <Image
          src={getOptimizedImageUrl(item.posterUrl)}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized={item.posterUrl.includes('/api/stream/')}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          {item.contentType === 'Series' ? (
            <Tv className="w-12 h-12 text-white/10" />
          ) : (
            <Film className="w-12 h-12 text-white/10" />
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h3 className="font-semibold text-white line-clamp-1">{item.title}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-secondary-foreground bg-secondary/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {item.contentType}
          </span>
        </div>
      </div>
    </button>
  );
});
