'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTopPodcasts } from '@/features/music/api';

export default function PodcastsPage() {
  const router = useRouter();
  const t = useTranslations('music');
  const [podcasts, setPodcasts] = useState<
    { id: string; title: string; image: string }[]
  >([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (p: number) => {
    try {
      const data = await getTopPodcasts(p);
      setPodcasts((prev) => (p === 1 ? data : [...prev, ...data]));
      setHasMore(data.length >= 20);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          const next = page + 1;
          setPage(next);
          loadPage(next);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadPage]);

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
