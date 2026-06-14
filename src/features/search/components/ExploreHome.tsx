'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

interface ExploreItem {
  id: string;
  title: string;
  genre: string;
  cover: string;
  imdbRating: string | null;
  releaseDate: string;
  type: 'movie' | 'series';
}

interface ExploreSection {
  title: string;
  items: ExploreItem[];
}

interface ExploreData {
  banner: {
    title: string;
    image: string;
    detailPath: string;
    subjectId: string;
  }[];
  sections: ExploreSection[];
}

/**
 * Strips emoji characters from section titles.
 * Keeps letters, numbers, whitespace, and basic punctuation.
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
  const router = useRouter();
  const [data, setData] = useState<ExploreData | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const pref = localStorage.getItem('nightwatch:exploreOnHome');
    setEnabled(pref === 'true');
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetch('/api/video/explore/home', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((result) => {
        if (result) setData(result);
      })
      .catch(() => {});
  }, [enabled]);

  if (!enabled || !data?.sections?.length) return null;

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleItemClick = (item: ExploreItem) => {
    setSelectedContentId(item.id);
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mx-auto">
          <div className="flex bg-background border-[3px] border-border overflow-hidden">
            <div className="flex-grow flex items-center px-5 py-4">
              <span
                className="material-symbols-outlined text-2xl mr-3 text-foreground/50"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search movies, shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full bg-transparent border-none outline-none font-headline text-lg font-bold uppercase placeholder:text-foreground/30 text-foreground"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchQuery.trim()) {
                  router.push(
                    `/search?q=${encodeURIComponent(searchQuery.trim())}`,
                  );
                }
              }}
              className="bg-neo-yellow text-foreground border-l-[3px] border-border px-8 font-headline text-base font-black uppercase tracking-widest hover:bg-primary hover:text-neo-yellow transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        {/* Sections */}
        {data.sections.slice(0, 8).map((section) => (
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
