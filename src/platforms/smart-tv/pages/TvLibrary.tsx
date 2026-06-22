'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useClips } from '@/features/clips/hooks/use-clips';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function FocusableClipCard({
  clip,
}: {
  clip: { id: string; title: string; thumbnailUrl: string | null };
}) {
  const router = useRouter();
  const { ref, focused } = useFocusable({
    onEnterPress: () => router.push(`/clip/${clip.id}`),
  });

  return (
    <div
      ref={ref}
      className={`relative rounded-xl overflow-hidden border-[3px] transition-all ${
        focused ? 'border-tv-focus scale-105 z-10' : 'border-border'
      }`}
    >
      {clip.thumbnailUrl ? (
        <div className="relative w-full aspect-video">
          <Image
            src={clip.thumbnailUrl}
            alt={clip.title}
            className="object-cover"
            fill
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-secondary" />
      )}
      <div className="p-3 bg-card">
        <p className="text-sm font-headline font-bold uppercase tracking-tight truncate">
          {clip.title}
        </p>
      </div>
    </div>
  );
}

function LibraryEmpty() {
  const { ref, focused } = useFocusable();
  return (
    <div
      ref={ref}
      className={`py-32 border-[4px] border-dashed text-center flex flex-col items-center justify-center bg-card rounded-xl transition-colors ${
        focused ? 'border-tv-focus' : 'border-border'
      }`}
    >
      <span className="material-symbols-outlined text-6xl text-foreground/20 mb-6">
        content_cut
      </span>
      <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
        No Clips
      </p>
      <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
        Record moments from live streams to see them here
      </p>
    </div>
  );
}

export function TvLibrary() {
  const t = useTranslations('common');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_LIBRARY_PAGE' });
  const { clips, isLoading } = useClips({});

  useTvFocus('tv-library', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto pb-32">
        {/* Hero Header — same as web */}
        <div className="mb-12 bg-neo-orange relative overflow-hidden rounded-2xl mx-8 mt-8">
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-30 rotate-12" />
          <div className="relative z-10 px-10 py-12">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
              MY
              <br />
              <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                LIBRARY
              </span>
            </h1>
            <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
              {t('clips.subtitle')}
            </p>
          </div>
        </div>

        {/* Clips Grid */}
        <div className="px-8">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {['cs1', 'cs2', 'cs3'].map((id) => (
                <div
                  key={id}
                  className="bg-card border-[3px] border-border p-2 rounded-xl"
                >
                  <div className="aspect-video bg-muted animate-pulse mb-4 border-[3px] border-border" />
                  <div className="px-2 pb-2 space-y-2">
                    <div className="h-7 bg-muted animate-pulse w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && clips.length === 0 && <LibraryEmpty />}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {clips.map((clip) => (
              <FocusableClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
