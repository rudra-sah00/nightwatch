'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { type ExploreData, type ExploreItem, getExploreHome } from '../api';
import { HeroCarousel } from './HeroCarousel';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

/**
 * Strips emoji characters from section titles.
 */
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

export function ExploreHome() {
  const [enabled, setEnabled] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const pref = localStorage.getItem('nightwatch:exploreOnHome');
    setEnabled(pref === 'true');
  }, []);

  const { data } = useQuery<ExploreData | null>({
    queryKey: ['explore', 'home'],
    queryFn: () => getExploreHome(),
    enabled,
  });

  if (!enabled || !data) return null;

  const handleItemClick = (item: ExploreItem) => {
    setSelectedContentId(item.id);
  };

  const hasBanner = data.banner?.length > 0;
  const hasTrending = data.trending?.length > 0;

  return (
    <>
      {/* Hero Carousel */}
      {hasBanner && hasTrending && (
        <HeroCarousel
          banner={data.banner}
          trending={data.trending}
          onItemClick={handleItemClick}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Content Rows */}
        {data.sections?.slice(0, 8).map((section) => (
          <section key={section.title}>
            <h2 className="font-headline font-black text-xl uppercase tracking-tight text-foreground mb-4">
              {stripEmojis(section.title)}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
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
        ))}
      </div>

      {/* Content Detail Modal */}
      {selectedContentId && (
        <ContentDetailModal
          contentId={selectedContentId}
          onClose={() => setSelectedContentId(null)}
        />
      )}
    </>
  );
}
