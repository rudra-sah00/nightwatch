'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useRef, useState } from 'react';
import {
  getMangaFavorites,
  getMangaLatest,
  getMangaProgress,
  getMangaRanking,
  type MangaTitle,
  searchManga,
} from '@/features/manga/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

const FocusableMangaCard = memo(function FocusableMangaCard({
  title,
  onPress,
}: {
  title: MangaTitle;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });
  return (
    <div
      ref={ref}
      className={`flex flex-col rounded-xl overflow-hidden border-[3px] transition-all ${
        focused ? 'border-tv-focus scale-105 z-10' : 'border-border'
      }`}
    >
      <div className="aspect-[2/3] relative bg-muted">
        {title.portraitImageUrl && (
          <Image
            src={title.portraitImageUrl}
            alt={title.name}
            className="absolute inset-0 w-full h-full object-cover"
            fill
            unoptimized
          />
        )}
      </div>
      <div className="p-2 bg-card">
        <p className="text-xs font-headline font-bold uppercase truncate">
          {title.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {title.author}
        </p>
      </div>
    </div>
  );
});

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations('common.tv.manga');
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref, focused } = useFocusable({
    focusKey: 'MANGA_SEARCH',
    onEnterPress: () => inputRef.current?.focus(),
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 px-5 py-3 rounded-xl border-[3px] transition-all ${
        focused ? 'border-tv-focus bg-card' : 'border-border bg-card/50'
      }`}
    >
      <span className="material-symbols-outlined text-xl text-muted-foreground">
        search
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="bg-transparent outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}

type Tab = 'popular' | 'latest' | 'favorites' | 'continue';

function FocusableTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });
  return (
    <div
      ref={ref}
      className={`px-5 py-2 rounded-lg font-headline font-bold uppercase tracking-widest text-sm transition-all ${
        focused ? 'ring-2 ring-tv-focus' : ''
      } ${active ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}
    >
      {label}
    </div>
  );
}

export function TvManga() {
  const t = useTranslations('common.tv.manga');
  const router = useRouter();
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_MANGA_PAGE' });
  const [tab, setTab] = useState<Tab>('popular');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data: ranking, isLoading } = useQuery({
    queryKey: ['manga', 'ranking'],
    queryFn: () => getMangaRanking(),
    retry: false,
  });
  const { data: latest } = useQuery({
    queryKey: ['manga', 'latest'],
    queryFn: () => getMangaLatest(),
    retry: false,
  });
  const { data: favorites } = useQuery({
    queryKey: ['manga', 'favorites'],
    queryFn: () => getMangaFavorites(),
    retry: false,
  });
  const { data: progress } = useQuery({
    queryKey: ['manga', 'progress'],
    queryFn: () => getMangaProgress(),
    retry: false,
  });
  const { data: searchResults } = useQuery({
    queryKey: ['manga', 'search', debouncedSearch],
    queryFn: () => searchManga(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    retry: false,
  });

  useTvFocus('tv-manga', FOCUS_KEYS.CONTENT);

  const openManga = useCallback(
    (titleId: number) => {
      router.push(`/manga/title/${titleId}`);
    },
    [router],
  );

  let titles: MangaTitle[] = [];
  if (debouncedSearch.length >= 2 && searchResults?.titles) {
    titles = searchResults.titles;
  } else if (tab === 'popular') {
    titles = ranking?.titles ?? [];
  } else if (tab === 'latest') {
    titles = latest?.titles ?? [];
  } else if (tab === 'favorites') {
    titles = (favorites?.favorites ?? []).map((f) => ({
      titleId: f.titleId,
      name: f.title,
      author: f.author,
      portraitImageUrl: f.portraitImageUrl,
      landscapeImageUrl: '',
      viewCount: 0,
      language: '',
      updateStatus: '',
    }));
  } else if (tab === 'continue') {
    titles = (progress?.progress ?? []).map((p) => ({
      titleId: p.titleId,
      name: p.titleName,
      author: '',
      portraitImageUrl: p.portraitImageUrl,
      landscapeImageUrl: '',
      viewCount: 0,
      language: '',
      updateStatus: '',
    }));
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Manga</h1>
          <SearchInput value={search} onChange={setSearch} />
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <FocusableTab
            label={t('popular')}
            active={tab === 'popular'}
            onPress={() => setTab('popular')}
          />
          <FocusableTab
            label={t('latest')}
            active={tab === 'latest'}
            onPress={() => setTab('latest')}
          />
          <FocusableTab
            label={t('favorites')}
            active={tab === 'favorites'}
            onPress={() => setTab('favorites')}
          />
          <FocusableTab
            label={t('continue')}
            active={tab === 'continue'}
            onPress={() => setTab('continue')}
          />
        </div>

        {isLoading && <p className="text-muted-foreground">Loading...</p>}

        {/* Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {titles.map((title) => (
            <FocusableMangaCard
              key={title.titleId}
              title={title}
              onPress={() => openManga(title.titleId)}
            />
          ))}
        </div>

        {!isLoading && titles.length === 0 && (
          <p className="text-muted-foreground mt-4">No manga found</p>
        )}
      </div>
    </FocusContext.Provider>
  );
}
