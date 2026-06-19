'use client';

import { useQueries } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  getBrowseModules,
  getMusicHome,
  getMusicLanguages,
  getSong,
  getTopPodcasts,
  getTrending,
} from '@/features/music/api';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { LanguagePickerDialog } from './LanguagePickerDialog';
import { MusicHeader } from './MusicHeader';
import { MusicSearchSpotlight } from './MusicSearchSpotlight';
import { MusicSections, type MusicSectionsData } from './MusicSections';
import { MusicSkeleton } from './MusicSkeleton';

export function MusicView() {
  const searchParams = useSearchParams();
  const play = useMusicStore((s) => s.play);
  const t = useTranslations('music');
  const [showExplore, setShowExplore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistKey, setPlaylistKey] = useState(0);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(
    new Set(['hindi', 'english']),
  );
  const [reloadKey, setReloadKey] = useState(0);

  // Load saved language preference
  useEffect(() => {
    getMusicLanguages()
      .then((langs) => {
        if (langs) setSelectedLangs(new Set(langs.split(',')));
      })
      .catch(() => {});
  }, []);

  const results = useQueries({
    queries: [
      {
        queryKey: ['music', 'home', reloadKey],
        queryFn: () => getMusicHome(),
      },
      {
        queryKey: ['music', 'trending', 'hindi', reloadKey],
        queryFn: () => getTrending('song', 'hindi').catch(() => []),
      },
      {
        queryKey: ['music', 'browse', reloadKey],
        queryFn: () => getBrowseModules().catch(() => ({ genres: [] })),
      },
      {
        queryKey: ['music', 'podcasts', reloadKey],
        queryFn: () => getTopPodcasts().catch(() => []),
      },
    ],
  });

  const loading = results.some((r) => r.isLoading);
  const home = results[0].data;
  const trending = results[1].data;
  const browse = results[2].data;
  const podcasts = results[3].data;

  const data: MusicSectionsData | null =
    home && trending && browse && podcasts
      ? {
          charts: home.charts,
          featured: home.featured,
          artists: home.artists,
          releases: home.releases,
          radio: home.radio,
          trendingSongs: trending as MusicSectionsData['trendingSongs'],
          genres: browse.genres,
          podcasts,
          forYou: home.forYou || [],
        }
      : null;

  // Auto-play from AI navigation: /music?play=songId
  const playRef = useRef(play);
  playRef.current = play;
  const playedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const playSongId = searchParams.get('play');
    if (!playSongId || playSongId === playedIdRef.current) return;
    playedIdRef.current = playSongId;
    getSong(playSongId)
      .then((song) => {
        if (song) playRef.current(song, [song]);
      })
      .catch(() => {});
  }, [searchParams]);

  return (
    <div
      ref={scrollRef}
      onScroll={() => {
        if (scrollRef.current) {
          setShowExplore(scrollRef.current.scrollTop < 100);
        }
      }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-28"
    >
      <MusicHeader
        selectedLangs={selectedLangs}
        onOpenLangPicker={() => setShowLangPicker(true)}
        onToggleCreatePlaylist={() => setShowCreatePlaylist(true)}
        onOpenSearch={() => setShowSearch(true)}
      />

      {showCreatePlaylist && (
        <CreatePlaylistDialog
          onClose={() => setShowCreatePlaylist(false)}
          onCreated={() => setPlaylistKey((k) => k + 1)}
        />
      )}

      {showLangPicker && (
        <LanguagePickerDialog
          selectedLangs={selectedLangs}
          onChangeLangs={setSelectedLangs}
          onClose={() => setShowLangPicker(false)}
          onApply={() => setReloadKey((k) => k + 1)}
        />
      )}

      {loading && !data && <MusicSkeleton />}

      {data && (
        <MusicSections data={data} playlistKey={playlistKey} onPlay={play} />
      )}

      {showSearch && (
        <MusicSearchSpotlight onClose={() => setShowSearch(false)} />
      )}

      {showExplore && (
        <Link
          href="/music/discover"
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 h-12 px-4 sm:px-6 flex items-center gap-2 rounded-full bg-neo-yellow border-[3px] border-black shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <Compass className="w-5 h-5 text-black" />
          <span className="hidden sm:block font-headline font-black text-sm uppercase tracking-wider text-black">
            {t('explore')}
          </span>
        </Link>
      )}
    </div>
  );
}
