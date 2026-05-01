'use client';

import { Film, Plus, Tv } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';
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
  const { watchlist, loading, selectedId, setSelectedId, removeItem } =
    useWatchlist();
  const t = useTranslations('watch.watchlist');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return watchlist;
    const q = search.toLowerCase();
    return watchlist.filter((item) => item.title.toLowerCase().includes(q));
  }, [watchlist, search]);

  return (
    <>
      <div className="pb-32 animate-in fade-in">
        {/* Hero Header */}
        <div className="mb-12 bg-neo-red relative overflow-hidden shrink-0 rounded-2xl">
          {/* Abstract background shapes */}
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />

          <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white font-headline uppercase leading-none mb-4 min-w-0">
                  {t('pageTitle')}
                  <br />
                  <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                    {t('watchlist')}
                  </span>
                </h1>
                <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-neo-surface inline-block px-4 py-2 border-[3px] border-border">
                  {t('subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 md:px-10">
          <div className="max-w-5xl mx-auto w-full space-y-6">
            {!loading && (
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
                <NeoSearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                />
              </div>
            )}
            {loading ? (
              <div className="flex flex-col gap-6">
                {['wl-sk-1', 'wl-sk-2', 'wl-sk-3', 'wl-sk-4'].map((id) => (
                  <div
                    key={id}
                    className="w-full h-40 bg-muted animate-pulse border-[4px] border-border"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-32 border-[4px] border-border border-dashed text-center flex flex-col items-center justify-center bg-card">
                <Plus className="w-16 h-16 text-foreground/20 mb-6" />
                <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
                  {search ? t('noResults') : t('emptyTitle')}
                </p>
                {!search && (
                  <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
                    {t('emptyDescription')}
                  </p>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col gap-6"
                style={{ contentVisibility: 'auto' }}
              >
                {filtered.map((item) => (
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
  const t = useTranslations('watch.watchlist');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col w-full sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t('viewDetails', { title: item.title })}
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
