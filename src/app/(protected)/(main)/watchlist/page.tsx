'use client';

import { Film, Loader2, Tv } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { ContentDetailModal } from '@/features/search/components/content-detail-modal';
import { getWatchlist } from '@/features/watchlist/api';
import type { WatchlistItem } from '@/features/watchlist/types';
import { getOptimizedImageUrl } from '@/lib/utils';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [_isIdModalOpen, setIsIdModalOpen] = useState(false);

  // Fetch watchlist
  const fetchWatchlist = useCallback(async () => {
    try {
      const items = await getWatchlist();
      setWatchlist(items);
    } catch (_e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      fetchWatchlist();
    }
  }, [selectedId, fetchWatchlist]);

  const handleItemClick = (contentId: string) => {
    setSelectedId(contentId);
    setIsIdModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">My Watchlist</h1>
          <span className="text-muted-foreground">
            {watchlist.length} {watchlist.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {watchlist.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
              <div className="p-4 rounded-full bg-white/10">
                <Film className="w-8 h-8 opacity-50" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Your list is empty</h3>
                <p className="text-muted-foreground">
                  Movies and series you add to your watchlist will appear here.
                  Ask Rudra AI to add something!
                </p>
              </div>
              <Button asChild variant="secondary" className="mt-4">
                <Link href="/">Browse Content</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {watchlist.map((item) => (
              <button
                type="button"
                key={item.id}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 cursor-pointer text-left"
                onClick={() => handleItemClick(item.contentId)}
              >
                {/* Poster Image or Fallback */}
                {item.posterUrl ? (
                  <Image
                    src={getOptimizedImageUrl(item.posterUrl)}
                    alt={item.title}
                    fill
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

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="font-semibold text-white line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-secondary-foreground bg-secondary/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {item.contentType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 transform translate-y-2 group-hover:translate-y-0">
                    <p className="text-xs text-white/70 italic">
                      Click for details
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <ContentDetailModal
          contentId={selectedId}
          onClose={() => {
            setIsIdModalOpen(false);
            setSelectedId(null);
          }}
        />
      )}
    </>
  );
}
