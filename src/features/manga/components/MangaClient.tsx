'use client';

import {
  BookOpen,
  Heart,
  History,
  Search,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { MangaTitle } from '@/features/manga/api';
import {
  getMangaFavorites,
  getMangaLatest,
  getMangaProgress,
  getMangaRanking,
  removeMangaFavorite,
  removeMangaProgress,
} from '@/features/manga/api';

import { MangaSearchSpotlight } from './MangaSearchSpotlight';

type Tab = 'ranking' | 'latest' | 'saved' | 'continue';

function MangaCard({
  title,
  onRemove,
}: {
  title: MangaTitle;
  onRemove?: () => void;
}) {
  return (
    <Link
      href={`/manga/title/${title.titleId}`}
      className="group bg-card border-[3px] border-border overflow-hidden hover:border-foreground/40 transition-colors relative"
    >
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="absolute top-1.5 right-1.5 z-10 p-1.5 bg-background/80 border-[2px] border-border opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-neo-red hover:text-white"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <div className="aspect-[2/3] relative bg-muted">
        {title.portraitImageUrl ? (
          <Image
            src={title.portraitImageUrl}
            alt={title.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-foreground/20" />
          </div>
        )}
        {title.updateStatus === 'new' && (
          <span className="absolute top-2 left-2 bg-neo-cyan text-black font-headline font-black text-[9px] uppercase tracking-widest px-2 py-0.5 border-[2px] border-border">
            New
          </span>
        )}
        {title.updateStatus === 'up' && (
          <span className="absolute top-2 left-2 bg-neo-yellow text-black font-headline font-black text-[9px] uppercase tracking-widest px-2 py-0.5 border-[2px] border-border">
            Update
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-headline font-black text-xs uppercase tracking-wide leading-tight line-clamp-2">
          {title.name}
        </h3>
        <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider mt-1 line-clamp-1">
          {title.author}
        </p>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 px-6">
      {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => (
        <div key={id} className="bg-card border-[3px] border-border">
          <div className="aspect-[2/3] bg-muted animate-pulse" />
          <div className="p-2.5 space-y-1.5">
            <div className="h-3 bg-muted animate-pulse w-3/4" />
            <div className="h-2 bg-muted animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MangaClient() {
  const [tab, setTab] = useState<Tab>('ranking');
  const [titles, setTitles] = useState<MangaTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'saved') {
        const res = await getMangaFavorites();
        setTitles(
          res.favorites.map((f) => ({
            titleId: f.titleId,
            name: f.title,
            author: f.author,
            portraitImageUrl: f.portraitImageUrl,
            landscapeImageUrl: '',
            viewCount: 0,
            language: 'en',
            updateStatus: 'none',
          })),
        );
      } else if (t === 'continue') {
        const res = await getMangaProgress();
        setTitles(
          res.progress.map((p) => ({
            titleId: p.titleId,
            name: p.titleName,
            author: `${p.chapterName} · p.${p.pageIndex + 1}`,
            portraitImageUrl: p.portraitImageUrl,
            landscapeImageUrl: '',
            viewCount: 0,
            language: 'en',
            updateStatus: 'none',
          })),
        );
      } else {
        const res =
          t === 'ranking' ? await getMangaRanking() : await getMangaLatest();
        setTitles(res.titles);
      }
    } catch {
      setTitles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab);
  }, [tab, fetchData]);

  const displayTitles = titles;

  const handleRemove = async (titleId: number) => {
    setTitles((prev) => prev.filter((t) => t.titleId !== titleId));
    try {
      if (tab === 'saved') await removeMangaFavorite(titleId);
      if (tab === 'continue') await removeMangaProgress(titleId);
    } catch {}
  };

  return (
    <main className="pb-32 animate-in fade-in">
      {/* Search Spotlight */}
      {showSearch && (
        <MangaSearchSpotlight onClose={() => setShowSearch(false)} />
      )}

      {/* Header — like music */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter">
          Manga
        </h1>
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-cyan hover:bg-neo-cyan/10 transition-colors"
          aria-label="Search manga"
        >
          <Search className="w-4 h-4 text-foreground/50" />
        </button>
      </div>

      {/* Tabs */}
      {
        <div className="flex gap-2 mb-6 px-6 overflow-x-auto no-scrollbar">
          {(
            [
              ['ranking', TrendingUp, 'Trending'],
              ['latest', Zap, 'Latest'],
              ['saved', Heart, 'Saved'],
              ['continue', History, 'Continue'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-headline font-black uppercase text-[10px] tracking-widest border-[2px] border-border transition-colors ${
                tab === key
                  ? 'bg-foreground text-background'
                  : 'bg-card text-foreground hover:bg-foreground/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      }

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : displayTitles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 px-6">
          {displayTitles.map((t) => (
            <MangaCard
              key={t.titleId}
              title={t}
              onRemove={
                tab === 'saved' || tab === 'continue'
                  ? () => handleRemove(t.titleId)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="mx-6 py-24 border-[4px] border-border border-dashed text-center flex flex-col items-center justify-center bg-card">
          <BookOpen className="w-12 h-12 text-foreground/20 mb-4" />
          <p className="font-headline font-black text-xl uppercase tracking-widest text-foreground/40">
            No manga found
          </p>
        </div>
      )}
    </main>
  );
}
