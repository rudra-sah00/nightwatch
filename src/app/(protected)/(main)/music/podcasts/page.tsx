'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { getTopPodcasts } from '@/features/music/api';

export default function PodcastsPage() {
  const router = useRouter();
  const t = useTranslations('music');
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading: loading,
    hasNextPage: hasMore,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['music', 'podcasts', 'all'],
    queryFn: ({ pageParam = 1 }) => getTopPodcasts(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= 20 ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const podcasts = useMemo(() => data?.pages.flat() ?? [], [data]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchNextPage]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      <div className="px-6 pt-6 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>
        <h1 className="font-headline font-black uppercase tracking-tighter text-2xl mt-4">
          {t('podcasts')}
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6">
        {podcasts.map((p) => (
          <Link key={p.id} href={`/music/podcast/${p.id}`} className="group">
            <div className="aspect-square border-[3px] border-border overflow-hidden rounded-xl group-hover:border-neo-yellow transition-colors">
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
              {p.title}
            </p>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-8">
          <span className="text-foreground/30 font-headline font-bold uppercase text-[10px] tracking-widest">
            {t('loading')}
          </span>
        </div>
      )}
    </div>
  );
}
