'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useMusicStore } from '@/features/music/store/use-music-store';
import type { MusicTrack } from '@/features/music/types';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

interface TvMusicDetailProps {
  title: string;
  image?: string;
  subtitle?: string;
  songs: MusicTrack[];
  isLoading?: boolean;
}

function TrackItem({
  track,
  index,
  songs,
  isActive,
}: {
  track: MusicTrack;
  index: number;
  songs: MusicTrack[];
  isActive: boolean;
}) {
  const play = useMusicStore((s) => s.play);
  const { ref, focused } = useFocusable({
    onEnterPress: () => play(track, songs, index),
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
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
        focused
          ? 'bg-indigo-500/20 ring-2 ring-indigo-500'
          : isActive
            ? 'bg-white/5'
            : ''
      }`}
    >
      <span
        className={`text-sm w-6 text-right font-mono ${isActive ? 'text-indigo-400' : 'text-white/40'}`}
      >
        {index + 1}
      </span>
      <img
        src={track.image}
        alt=""
        className="w-10 h-10 rounded object-cover shrink-0"
        loading="lazy"
        decoding="async"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isActive ? 'text-indigo-400' : 'text-white'}`}
        >
          {track.title}
        </p>
        <p className="text-xs text-white/40 truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-white/30 font-mono">
        {Math.floor(track.duration / 60)}:
        {String(Math.floor(track.duration % 60)).padStart(2, '0')}
      </span>
    </div>
  );
}

function PlayAllButton({ songs }: { songs: MusicTrack[] }) {
  const play = useMusicStore((s) => s.play);
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (songs.length > 0) play(songs[0], songs, 0);
    },
  });
  return (
    <button
      ref={ref}
      type="button"
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
        focused
          ? 'bg-indigo-500 text-white scale-105'
          : 'bg-white/10 text-white/80'
      }`}
    >
      <span className="material-symbols-outlined">play_arrow</span>
      Play All
    </button>
  );
}

function BackButton() {
  const router = useRouter();
  const { ref, focused } = useFocusable({ onEnterPress: () => router.back() });
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        focused ? 'bg-foreground text-background' : 'text-muted-foreground'
      }`}
    >
      <span className="material-symbols-outlined text-lg">arrow_back</span>
      Back
    </div>
  );
}

export function TvMusicDetail({
  title,
  image,
  subtitle,
  songs,
  isLoading,
}: TvMusicDetailProps) {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_MUSIC_DETAIL' });

  useTvFocus('tv-music-detail', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-end gap-6 p-8 pb-6">
          <BackButton />
        </div>
        <div className="flex items-end gap-6 px-8 pb-6">
          {image && (
            <img
              src={image}
              alt={title}
              className="w-40 h-40 rounded-2xl object-cover shadow-xl shrink-0"
              decoding="async"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-white/50 mt-1">{subtitle}</p>
            )}
            <p className="text-xs text-white/30 mt-2">{songs.length} songs</p>
            <div className="mt-4">
              <PlayAllButton songs={songs} />
            </div>
          </div>
        </div>

        {/* Track list */}
        <div className="px-8 pb-8 flex flex-col gap-1">
          {isLoading && <p className="text-white/40">Loading...</p>}
          {songs.slice(0, 100).map((track, i) => (
            <TrackItem
              key={track.id}
              track={track}
              index={i}
              songs={songs}
              isActive={currentTrack?.id === track.id}
            />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
