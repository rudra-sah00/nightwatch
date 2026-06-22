'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getMangaDetail, type MangaChapter } from '@/features/manga/api';
import { useTvFocus } from '@/platforms/smart-tv/hooks/use-tv-focus';
import { FOCUS_KEYS } from '@/platforms/smart-tv/lib/focus-keys';

function BackButton() {
  const router = useRouter();
  const { ref, focused } = useFocusable({ onEnterPress: () => router.back() });
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${focused ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
    >
      <span className="material-symbols-outlined text-lg">arrow_back</span> Back
    </div>
  );
}

function ChapterItem({
  chapter,
  onPress,
}: {
  chapter: MangaChapter;
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
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border-[3px] transition-all ${focused ? 'border-indigo-500 bg-secondary/50' : 'border-border'}`}
    >
      {chapter.thumbnailUrl && (
        <img
          src={chapter.thumbnailUrl}
          alt=""
          className="w-16 h-10 rounded object-cover shrink-0"
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{chapter.name}</p>
        {chapter.subTitle && (
          <p className="text-xs text-muted-foreground truncate">
            {chapter.subTitle}
          </p>
        )}
      </div>
      <span className="material-symbols-outlined text-muted-foreground">
        chevron_right
      </span>
    </div>
  );
}

export function TvMangaTitle() {
  const t = useTranslations('common.tv.mangaTitle');
  const router = useRouter();
  const params = useParams<{ titleId: string }>();
  const titleId = Number(params.titleId);
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_MANGA_TITLE' });

  const { data, isLoading } = useQuery({
    queryKey: ['manga', 'detail', titleId],
    queryFn: () => getMangaDetail(titleId),
    enabled: titleId > 0,
    retry: false,
  });

  useTvFocus('tv-manga-title', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto">
        <div className="p-8">
          <BackButton />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Header */}
            <div className="flex gap-6 px-8 pb-6">
              <img
                src={data.title.portraitImageUrl}
                alt=""
                className="w-32 h-48 rounded-xl object-cover shrink-0"
                decoding="async"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold mb-2">{data.title.name}</h1>
                <p className="text-sm text-muted-foreground mb-1">
                  {data.title.author}
                </p>
                {data.rating && (
                  <p className="text-xs text-white/40">⭐ {data.rating}</p>
                )}
                {data.overview && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                    {data.overview}
                  </p>
                )}
              </div>
            </div>

            {/* Chapters */}
            <div className="px-8 pb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                {data.chapters.length} {t('chapters')}
              </h2>
              <div className="flex flex-col gap-2">
                {data.chapters.slice(0, 100).map((ch) => (
                  <ChapterItem
                    key={ch.chapterId}
                    chapter={ch}
                    onPress={() =>
                      router.push(`/manga/chapter/${ch.chapterId}`)
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </FocusContext.Provider>
  );
}
