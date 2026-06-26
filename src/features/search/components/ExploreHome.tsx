'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ExploreData,
  type ExploreItem,
  getExploreHome,
  getShowDetails,
} from '../api';
import { HeroCarousel } from './HeroCarousel';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

const ExploreSearchSpotlight = dynamic(
  () =>
    import('./ExploreSearchSpotlight').then((m) => m.ExploreSearchSpotlight),
  { ssr: false },
);

function stripEmojis(text: string): string {
  const cleaned: string[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x2600 && code <= 0x27ff) continue;
    if (code >= 0xfe00 && code <= 0xfeff) continue;
    if (code >= 0x1f000 && code <= 0x1ffff) continue;
    if (code >= 0xe0000 && code <= 0xe007f) continue;
    cleaned.push(char);
  }
  return cleaned.join('').trim();
}

/** Memoized content row to prevent re-renders when other sections update */
const ContentRow = memo(function ContentRow({
  title,
  items,
  sectionIndex,
  onItemClick,
}: {
  title: string;
  items: ExploreItem[];
  sectionIndex: number;
  onItemClick: (item: ExploreItem) => void;
}) {
  const queryClient = useQueryClient();
  const handlePrefetch = useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        queryKey: ['show', id],
        queryFn: () => getShowDetails(id),
        staleTime: 60_000,
      });
    },
    [queryClient],
  );

  return (
    <section>
      <h2 className="font-headline font-black text-xl uppercase tracking-tight text-foreground mb-4">
        {stripEmojis(title)}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            onMouseEnter={() => handlePrefetch(item.id)}
            onFocus={() => handlePrefetch(item.id)}
            className="shrink-0 w-[140px] group text-left cursor-pointer"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-border bg-secondary">
              {item.cover && (
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="140px"
                  loading={sectionIndex < 2 && i < 6 ? 'eager' : 'lazy'}
                />
              )}
              {item.imdbRating && (
                <span className="absolute top-1 right-1 bg-neo-yellow text-foreground text-xs font-bold px-1.5 py-0.5 rounded font-headline">
                  {item.imdbRating}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs font-headline font-bold text-foreground truncate">
              {item.title}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {item.genre}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
});

export function ExploreHome() {
  const [enabled, setEnabled] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem('nightwatch:exploreOnHome') === 'true');
  }, []);

  const { data, isLoading } = useQuery<ExploreData | null>({
    queryKey: ['explore', 'home'],
    queryFn: getExploreHome,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 min — avoid refetching on every focus
  });

  const handleItemClick = useCallback((item: ExploreItem) => {
    setSelectedContentId(item.id);
  }, []);

  const trendingItems = useMemo(
    () =>
      data?.trending?.length ? data.trending : data?.sections?.[0]?.items || [],
    [data],
  );

  if (!enabled) return null;

  if (isLoading || !data) {
    return (
      <div className="w-full">
        {/* Hero skeleton */}
        <div className="w-full aspect-[16/7] sm:aspect-[21/9] max-h-[400px] bg-secondary animate-pulse rounded-lg" />
        {/* Rows skeleton */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
          {[0, 1, 2].map((row) => (
            <section key={row}>
              <div className="h-6 w-40 bg-secondary animate-pulse rounded mb-4" />
              <div className="flex gap-3 overflow-hidden">
                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => (
                  <div
                    key={`${row}${k}`}
                    className="shrink-0 w-[120px] sm:w-[140px]"
                  >
                    <div className="aspect-[2/3] bg-secondary animate-pulse rounded-lg" />
                    <div className="h-3 w-4/5 bg-secondary animate-pulse rounded mt-2" />
                    <div className="h-2.5 w-1/2 bg-secondary animate-pulse rounded mt-1" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search Icon - top right */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-pointer"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-foreground" />
      </button>

      {/* Search Spotlight */}
      {searchOpen && (
        <ExploreSearchSpotlight onClose={() => setSearchOpen(false)} />
      )}

      {trendingItems.length > 0 && (
        <HeroCarousel
          banner={data.banner}
          trending={trendingItems}
          onItemClick={handleItemClick}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {data.sections?.slice(0, 8).map((section, i) => (
          <ContentRow
            key={section.title}
            title={section.title}
            items={section.items}
            sectionIndex={i}
            onItemClick={handleItemClick}
          />
        ))}
      </div>

      {selectedContentId && (
        <ContentDetailModal
          contentId={selectedContentId}
          onClose={() => setSelectedContentId(null)}
        />
      )}
    </>
  );
}
