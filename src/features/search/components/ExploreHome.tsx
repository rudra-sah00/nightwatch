'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

export function ExploreHome() {
  const [data, setData] = useState<ExploreData | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const pref = localStorage.getItem('nightwatch:exploreOnHome');
    setEnabled(pref === 'true');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetch('/api/video/explore/home', { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [enabled]);

  if (!enabled || !data?.sections?.length) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {data.sections.slice(0, 8).map((section) => (
        <section key={section.title}>
          <h2 className="font-headline font-black text-xl uppercase tracking-tight text-foreground mb-4">
            {section.title}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {section.items.map((item) => (
              <Link
                key={item.id}
                href={`/watch/${encodeURIComponent(item.id)}?type=${item.type}&title=${encodeURIComponent(item.title)}`}
                className="shrink-0 w-[140px] group"
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
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
