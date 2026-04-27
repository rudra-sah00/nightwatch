'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import ReactSkeleton from 'react-loading-skeleton';
import { toast } from 'sonner';
import { AppSkeletonTheme } from '@/components/ui/skeleton-theme';
import {
  createUserPlaylist,
  getCharts,
  getFeaturedPlaylists,
  getNewReleases,
  getRadioStations,
  getTopArtists,
  getTopPodcasts,
  searchMusic,
} from '@/features/music/api';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';
import { Card, ScrollRow, Section } from './MusicPrimitives';
import { MusicSearchSpotlight } from './MusicSearchSpotlight';
import { UserPlaylists } from './UserPlaylists';

type ChartItem = { id: string; title: string; image: string };
type ArtistItem = { id: string; name: string; image: string };
type ReleaseItem = { id: string; title: string; artist: string; image: string };
type RadioItem = { id: string; title: string; image: string; language: string };

export function MusicView() {
  const t = useTranslations('music');
  const searchParams = useSearchParams();
  const player = useMusicPlayerContext();
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [featured, setFeatured] = useState<ChartItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [podcasts, setPodcasts] = useState<ChartItem[]>([]);
  const [radio, setRadio] = useState<RadioItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getCharts().then(setCharts),
      getFeaturedPlaylists().then(setFeatured),
      getTopArtists().then(setArtists),
      getNewReleases().then(setReleases),
      getTopPodcasts().then(setPodcasts),
      getRadioStations('hindi').then(setRadio),
    ]).finally(() => setLoading(false));
  }, []);

  // Auto-play from AI navigation: /music?play=songId
  useEffect(() => {
    const playSongId = searchParams.get('play');
    if (!playSongId) return;
    searchMusic(playSongId)
      .then((results) => {
        const song =
          results.songs.find((s) => s.id === playSongId) ?? results.songs[0];
        if (song) player.play(song, results.songs);
      })
      .catch(() => {});
  }, [searchParams, player]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter">
          {t('title')}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreatePlaylist((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
            aria-label={t('createPlaylist')}
          >
            <Plus className="w-4 h-4 text-foreground/50" />
          </button>
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
            aria-label={t('searchMusic')}
          >
            <Search className="w-4 h-4 text-foreground/50" />
          </button>
        </div>
      </div>

      {showCreatePlaylist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowCreatePlaylist(false);
            setNewPlaylistName('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowCreatePlaylist(false);
              setNewPlaylistName('');
            }
          }}
          role="dialog"
        >
          <div
            className="bg-background border-[3px] border-border p-6 w-80"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="dialog"
          >
            <h3 className="font-headline font-black uppercase tracking-tighter text-lg mb-4">
              {t('createPlaylist')}
            </h3>
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder={t('playlistName')}
              className="w-full bg-transparent border-none outline-none text-xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 border-border focus:border-neo-yellow py-2"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newPlaylistName.trim()) {
                  await createUserPlaylist(newPlaylistName.trim());
                  setNewPlaylistName('');
                  setShowCreatePlaylist(false);
                  toast.success(t('createPlaylist'));
                  window.location.reload();
                }
                if (e.key === 'Escape') {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                }
              }}
            />
          </div>
        </div>
      )}

      {loading && <MusicSkeleton />}

      {/* User Playlists */}
      {!loading && <UserPlaylists />}

      {/* Charts */}
      {!loading && charts.length > 0 && (
        <Section title={t('topCharts')}>
          <ScrollRow>
            {charts.map((c) => (
              <Card
                key={c.id}
                image={c.image}
                title={c.title}
                href={`/music/playlist/${c.id}`}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* Featured */}
      {!loading && featured.length > 0 && (
        <Section title={t('playlists')}>
          <ScrollRow>
            {featured.map((p) => (
              <Card
                key={p.id}
                image={p.image}
                title={p.title}
                href={`/music/playlist/${p.id}`}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* Artists */}
      {!loading && artists.length > 0 && (
        <Section title={t('topArtists')}>
          <ScrollRow>
            {artists.map((a) => (
              <Link
                key={a.id}
                href={`/music/artist/${a.id}`}
                className="flex-shrink-0 w-28 md:w-32 text-center"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[3px] border-border overflow-hidden mx-auto hover:border-neo-yellow transition-colors">
                  <img
                    src={a.image}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
                  {a.name}
                </p>
              </Link>
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* New Releases */}
      {!loading && releases.length > 0 && (
        <Section title={t('newReleases')}>
          <ScrollRow>
            {releases.map((r) => (
              <Card
                key={r.id}
                image={r.image}
                title={r.title}
                subtitle={r.artist}
                href={r.id ? `/music/playlist/${r.id}` : undefined}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* Podcasts */}
      {!loading && podcasts.length > 0 && (
        <Section title={t('podcasts')}>
          <ScrollRow>
            {podcasts.map((p) => (
              <Card key={p.id} image={p.image} title={p.title} />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* Radio */}
      {!loading && radio.length > 0 && (
        <Section title={t('radioStations')}>
          <ScrollRow>
            {radio.slice(0, 10).map((r) => (
              <Card key={r.id} image={r.image} title={r.title} />
            ))}
            <Link
              href="/music/radio/hindi"
              className="flex-shrink-0 w-36 md:w-40 flex items-center justify-center"
            >
              <span className="text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-xs tracking-widest transition-colors">
                {t('viewAll')}
              </span>
            </Link>
          </ScrollRow>
        </Section>
      )}

      {/* Search Spotlight */}
      {showSearch && (
        <MusicSearchSpotlight onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
}

function MusicSkeleton() {
  return (
    <AppSkeletonTheme>
      <div className="space-y-6 py-4">
        {[1, 2, 3, 4, 5, 6].map((section) => (
          <div key={section} className="px-6">
            <ReactSkeleton
              width={90}
              height={10}
              style={{ marginBottom: 12 }}
            />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((card) => (
                <div key={card} className="flex-shrink-0 w-36 md:w-40">
                  <ReactSkeleton className="w-36 md:w-40 aspect-square" />
                  <ReactSkeleton
                    width="70%"
                    height={10}
                    style={{ marginTop: 8 }}
                  />
                  <ReactSkeleton
                    width="45%"
                    height={8}
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppSkeletonTheme>
  );
}
