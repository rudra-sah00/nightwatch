'use client';

import { Compass } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getBrowseModules,
  getMusicHome,
  getMusicLanguages,
  getSong,
  getTopPodcasts,
  getTrending,
} from '@/features/music/api';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { LanguagePickerDialog } from './LanguagePickerDialog';
import { MusicHeader } from './MusicHeader';
import { MusicSearchSpotlight } from './MusicSearchSpotlight';
import { MusicSections, type MusicSectionsData } from './MusicSections';
import { MusicSkeleton } from './MusicSkeleton';
import { PlaylistActionMenu } from './PlaylistActionMenu';

/**
 * Top-level orchestrator for the `/music` home page.
 *
 * Coordinates data fetching, dialog state, and child component composition:
 * - Loads the music home feed (charts, featured playlists, artists, releases, radio),
 *   trending songs, and browse genres on mount via parallel API calls.
 * - Persists and restores the user's preferred music languages (cookie-backed).
 * - Supports deep-link auto-play via the `?play=<songId>` search parameter
 *   (used by the Ask AI feature to navigate users directly to a song).
 * - Manages open/close state for {@link MusicSearchSpotlight}, {@link CreatePlaylistDialog},
 *   and {@link LanguagePickerDialog}.
 * - Renders {@link MusicHeader} at the top, {@link MusicSkeleton} while loading,
 *   and {@link MusicSections} once data is ready.
 */
export function MusicView() {
  const searchParams = useSearchParams();
  const player = useMusicPlayerContext();
  const t = useTranslations('music');
  const [showExplore, setShowExplore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<MusicSectionsData>({
    charts: [],
    featured: [],
    artists: [],
    releases: [],
    radio: [],
    trendingSongs: [],
    genres: [],
    podcasts: [],
    forYou: [],
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlistKey, setPlaylistKey] = useState(0);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(
    new Set(['hindi', 'english']),
  );

  // Load saved language preference
  useEffect(() => {
    getMusicLanguages()
      .then((langs) => {
        if (langs) setSelectedLangs(new Set(langs.split(',')));
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      getMusicHome(),
      getTrending('song', 'hindi').catch(() => []),
      getBrowseModules().catch(() => ({ genres: [] })),
      getTopPodcasts().catch(() => []),
    ])
      .then(([home, trending, browse, podcasts]) => {
        setData({
          charts: home.charts,
          featured: home.featured,
          artists: home.artists,
          releases: home.releases,
          radio: home.radio,
          trendingSongs: trending,
          genres: browse.genres,
          podcasts,
          forYou: home.forYou || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-play from AI navigation: /music?play=songId
  const playRef = useRef(player.play);
  playRef.current = player.play;
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
        onToggleCreatePlaylist={() => setShowActionMenu(true)}
        onOpenSearch={() => setShowSearch(true)}
      />

      {showActionMenu && (
        <PlaylistActionMenu
          onClose={() => setShowActionMenu(false)}
          onCreatePlaylist={() => setShowCreatePlaylist(true)}
          onImportSpotify={async () => {
            try {
              const { SpotifyAuth } = await import('capacitor-spotify-auth');
              const { checkIsMobile } = await import('@/lib/electron-bridge');
              const clientId =
                process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
              const redirectUri = checkIsMobile()
                ? 'nightwatch://music/spotify/callback'
                : `${window.location.origin}/music/spotify/callback`;
              alert(`Debug: clientId=${clientId.slice(0, 8)}... mobile=${checkIsMobile()} uri=${redirectUri}`);
              const result = await SpotifyAuth.authorize({
                clientId,
                redirectUri,
                scopes: 'playlist-read-private playlist-read-collaborative',
              });
              // Got code natively — fire import directly
              const { apiFetch } = await import('@/lib/fetch');
              apiFetch('/api/music/spotify/import', {
                method: 'POST',
                body: JSON.stringify({
                  code: result.code,
                  redirectUri,
                }),
                headers: { 'Content-Type': 'application/json' },
              })
                .then(() => toast.success(t('spotifyImportStarted')))
                .catch(() => toast.error(t('spotifyImportFailed')));
            } catch (err) {
              alert(`Spotify error: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
        />
      )}

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
          onApply={loadData}
        />
      )}

      {loading && <MusicSkeleton />}

      {!loading && (
        <MusicSections
          data={data}
          playlistKey={playlistKey}
          onPlay={player.play}
        />
      )}

      {showSearch && (
        <MusicSearchSpotlight onClose={() => setShowSearch(false)} />
      )}

      {/* Floating Explore button — bottom center, hides on scroll */}
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
