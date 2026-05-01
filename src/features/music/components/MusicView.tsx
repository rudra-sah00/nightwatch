'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getBrowseModules,
  getMusicHome,
  getMusicLanguages,
  getSong,
  getTrending,
} from '@/features/music/api';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { LanguagePickerDialog } from './LanguagePickerDialog';
import { MusicHeader } from './MusicHeader';
import { MusicSearchSpotlight } from './MusicSearchSpotlight';
import { MusicSections, type MusicSectionsData } from './MusicSections';
import { MusicSkeleton } from './MusicSkeleton';

export function MusicView() {
  const searchParams = useSearchParams();
  const player = useMusicPlayerContext();

  const [data, setData] = useState<MusicSectionsData>({
    charts: [],
    featured: [],
    artists: [],
    releases: [],
    radio: [],
    trendingSongs: [],
    genres: [],
  });
  const [showSearch, setShowSearch] = useState(false);
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
    ])
      .then(([home, trending, browse]) => {
        setData({
          charts: home.charts,
          featured: home.featured,
          artists: home.artists,
          releases: home.releases,
          radio: home.radio,
          trendingSongs: trending,
          genres: browse.genres,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-play from AI navigation: /music?play=songId
  useEffect(() => {
    const playSongId = searchParams.get('play');
    if (!playSongId) return;
    getSong(playSongId)
      .then((song) => {
        if (song) player.play(song, [song]);
      })
      .catch(() => {});
  }, [searchParams, player]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      <MusicHeader
        selectedLangs={selectedLangs}
        onOpenLangPicker={() => setShowLangPicker(true)}
        onToggleCreatePlaylist={() => setShowCreatePlaylist((v) => !v)}
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
    </div>
  );
}
