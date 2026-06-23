'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getMusicHome, getUserPlaylists } from '@/features/music/api';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { TvCard } from '../components/TvCard';
import { TvRow } from '../components/TvRow';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function NowPlaying() {
  const t = useTranslations('common.tv.music');
  const { currentTrack, isPlaying, setExpanded } = useMusicStore();
  const { ref, focused } = useFocusable({
    focusKey: 'MUSIC_NOW_PLAYING',
    onEnterPress: () => {
      if (currentTrack) setExpanded(true);
    },
  });

  return (
    <div
      ref={ref}
      className={`mx-8 mb-8 flex items-center gap-6 p-6 rounded-2xl bg-card border transition-all ${
        focused ? 'border-tv-focus ring-2 ring-tv-focus' : 'border-border'
      }`}
    >
      {currentTrack ? (
        <>
          <Image
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-24 h-24 rounded-xl object-cover"
            width={96}
            height={96}
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">
              {currentTrack.title}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {currentTrack.artist}
            </p>
          </div>
          <span className="material-symbols-outlined text-3xl">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </>
      ) : (
        <>
          <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-muted-foreground">
              music_note
            </span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-muted-foreground">
              {t('noPlaying')}
            </p>
            <p className="text-sm text-muted-foreground">{t('browseHint')}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function TvMusic() {
  const router = useRouter();
  const t = useTranslations('common.tv.music');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_MUSIC_PAGE' });

  const { data: home, isLoading } = useQuery({
    queryKey: ['music', 'home'],
    queryFn: getMusicHome,
    retry: false,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['music', 'playlists'],
    queryFn: getUserPlaylists,
    retry: false,
  });

  useTvFocus('tv-music', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto py-8">
        <h1 className="text-2xl font-bold mb-6 px-8">{t('title')}</h1>

        <NowPlaying />

        {isLoading && (
          <p className="text-muted-foreground px-8">{t('loading')}</p>
        )}

        {/* Trending */}
        {home?.trending && home.trending.length > 0 && (
          <TvRow title="Trending" focusKey="MUSIC_TRENDING">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              home.trending.map((item) => (
                <TvCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  onPress={() => router.push(`/music/playlist/${item.id}`)}
                  onFocus={onChildFocus}
                />
              ))
            }
          </TvRow>
        )}

        {/* Charts */}
        {home?.charts && home.charts.length > 0 && (
          <TvRow title="Charts" focusKey="MUSIC_CHARTS">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              home.charts.map((item) => (
                <TvCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  onPress={() => router.push(`/music/playlist/${item.id}`)}
                  onFocus={onChildFocus}
                />
              ))
            }
          </TvRow>
        )}

        {/* New Releases */}
        {home?.releases && home.releases.length > 0 && (
          <TvRow title="New Releases" focusKey="MUSIC_RELEASES">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              home.releases.map((item) => (
                <TvCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  onPress={() => router.push(`/music/album/${item.albumId}`)}
                  onFocus={onChildFocus}
                />
              ))
            }
          </TvRow>
        )}

        {/* Featured */}
        {home?.featured && home.featured.length > 0 && (
          <TvRow title="Featured" focusKey="MUSIC_FEATURED">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              home.featured.map((item) => (
                <TvCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  onPress={() => router.push(`/music/playlist/${item.id}`)}
                  onFocus={onChildFocus}
                />
              ))
            }
          </TvRow>
        )}

        {/* Your Playlists */}
        {playlists.length > 0 && (
          <TvRow title="Your Playlists" focusKey="MUSIC_PLAYLISTS">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              playlists.map((pl) => (
                <TvCard
                  key={pl.id}
                  title={pl.name}
                  image={pl.coverUrl ?? undefined}
                  onPress={() => router.push(`/music/playlist-user/${pl.id}`)}
                  onFocus={onChildFocus}
                />
              ))
            }
          </TvRow>
        )}
      </div>
    </FocusContext.Provider>
  );
}
