'use client';

import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';
import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import { getGames } from '@/features/games/api';

const FEATURED_SLUG = 'gta-v';
const SHOWCASE_DELAY = 2000; // ms before transitioning to video

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GamesPage() {
  const t = useTranslations('common.gamesPage');
  const navT = useTranslations('common.nav');
  const [search, setSearch] = useState('');
  const [showShowcase, setShowShowcase] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: games = [], isLoading: loading } = useQuery({
    queryKey: ['games'],
    queryFn: getGames,
  });

  const featured = games.find((g) => g.slug === FEATURED_SLUG);

  // Shuffle once when games data changes (new fetch), not on every render
  const shuffled = useMemo(() => shuffle(games), [games]);

  const filtered = shuffled.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()),
  );

  // Transition to showcase after delay
  useEffect(() => {
    if (!featured) return;
    const timer = setTimeout(() => setShowShowcase(true), SHOWCASE_DELAY);
    return () => clearTimeout(timer);
  }, [featured]);

  // Auto-play video when showcase appears
  useEffect(() => {
    if (showShowcase && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [showShowcase]);

  return (
    <div className="min-h-full pb-32 overflow-x-hidden">
      <PageTitle title={navT('games')} href="/games" />
      {/* Hero with featured game showcase */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border-[3px] border-border">
        {/* Default banner — stays as base layer */}
        <div
          className={`bg-neo-green relative transition-opacity duration-700 ${showShowcase && featured ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-20 rotate-12" />
          <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
              {t('heroPlay')}
              <br />
              <span className="bg-background px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                {t('heroGames')}
              </span>
            </h1>
            <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
              {t('heroDescription')}
            </p>
          </div>
        </div>

        {/* Featured game showcase — fades in on top */}
        {featured && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${showShowcase ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Video background */}
            <video
              ref={videoRef}
              src={featured.video}
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

            {/* Content overlay */}
            <div className="relative z-10 h-full flex flex-col justify-end container mx-auto px-6 md:px-10 py-8 md:py-12">
              {/* NEW badge */}
              <div className="mb-3">
                <span className="bg-neo-green text-foreground font-headline font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 border-[2px] border-border">
                  ★ Newly Added
                </span>
              </div>

              {/* Title */}
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white font-headline uppercase leading-none mb-2">
                {featured.title}
              </h2>

              {/* Description */}
              <p className="text-white/70 text-sm md:text-base max-w-lg mb-6 font-medium">
                {featured.description}
              </p>

              {/* Play button */}
              <Link
                href={`/games/${featured.slug}`}
                className="inline-flex items-center gap-3 bg-white text-black font-headline font-black uppercase tracking-wider text-sm md:text-base px-8 py-3.5 border-[3px] border-border hover:bg-neo-green hover:text-foreground transition-colors w-fit group"
              >
                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                Play Now
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
            <NeoSearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
            />
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading
              ? [0, 1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={`skeleton-${n}`}
                    className="bg-card p-2 border-[3px] border-border"
                  >
                    <AppSkeletonTheme>
                      <Skeleton
                        containerClassName="block aspect-video"
                        height="100%"
                      />
                      <div className="px-2 pt-3 pb-2">
                        <Skeleton height={14} width="60%" />
                        <Skeleton height={10} width="80%" className="mt-1" />
                      </div>
                    </AppSkeletonTheme>
                  </div>
                ))
              : filtered.map((game) => (
                  <Link
                    key={game.slug}
                    href={`/games/${game.slug}`}
                    className="group bg-card p-2 border-[3px] border-border"
                  >
                    <div className="aspect-video bg-background flex items-center justify-center border-[3px] border-border overflow-hidden relative">
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:opacity-0 transition-opacity"
                      />
                      <video
                        src={game.video}
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseEnter={(e) =>
                          (e.target as HTMLVideoElement).play()
                        }
                        onMouseLeave={(e) => {
                          const v = e.target as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />
                    </div>
                    <div className="px-2 pt-3 pb-2">
                      <p className="font-headline font-black uppercase tracking-wider text-foreground text-sm">
                        {game.title}
                      </p>
                      <p className="text-xs text-foreground/50 mt-1">
                        {game.description}
                      </p>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
