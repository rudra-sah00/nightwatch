'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Pause, Play, Radio } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import {
  getArtistAlbums,
  getArtistStation,
  getMusicArtist,
  type MusicArtistAlbum,
  type MusicTrack,
} from '@/features/music/api';
import { showSongMenu } from '@/features/music/components/SongContextMenu';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { formatTime } from '@/features/music/utils';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvMusicDetail } from '@/platforms/smart-tv/pages/TvMusicDetail';

type Tab = 'overview' | 'songs' | 'albums';

export default function MusicArtistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const t = useTranslations('music');
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const togglePlay = useMusicStore((s) => s.togglePlay);

  const { data: artist, isLoading: loading } = useQuery({
    queryKey: ['music', 'artist', id],
    queryFn: () => getMusicArtist(id),
    enabled: !!id,
  });

  const songs = artist?.songs ?? [];
  const meta = artist ? { name: artist.name, image: artist.image } : null;

  const [albums, setAlbums] = useState<MusicArtistAlbum[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [songsVisible, setSongsVisible] = useState(50);
  const [albumPage, setAlbumPage] = useState(1);
  const [albumsHasMore, setAlbumsHasMore] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);

  useEffect(() => {
    if (artist?.topAlbums) {
      setAlbums(artist.topAlbums);
    }
  }, [artist?.topAlbums]);

  useEffect(() => {
    void tab; // trigger dependency
    setSongsVisible(50);
  }, [tab]);

  // TV: D-pad track list
  if (isTV()) {
    return (
      <TvMusicDetail
        title={artist?.name ?? 'Artist'}
        image={artist?.image}
        subtitle={`${songs.length} songs`}
        songs={songs}
        isLoading={loading}
      />
    );
  }

  const playArtistRadio = () => {
    if (!meta || radioLoading) return;
    setRadioLoading(true);
    getArtistStation(meta.name)
      .then((radioSongs) => {
        if (radioSongs.length > 0) {
          play(radioSongs[0], radioSongs);
        }
      })
      .catch(() => {})
      .finally(() => setRadioLoading(false));
  };

  const loadMoreAlbums = () => {
    if (albumsLoading || !albumsHasMore) return;
    setAlbumsLoading(true);
    const nextPage = albumPage + 1;
    getArtistAlbums(id, nextPage)
      .then((data) => {
        if (data.length === 0) {
          setAlbumsHasMore(false);
        } else {
          setAlbums((prev) => [...prev, ...data]);
          setAlbumPage(nextPage);
        }
      })
      .catch(() => setAlbumsHasMore(false))
      .finally(() => setAlbumsLoading(false));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('overview') },
    { key: 'songs', label: t('songs') },
    { key: 'albums', label: t('albums') },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      <div className="px-6 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>
      </div>

      {meta && (
        <div className="flex items-end gap-6 px-6 py-6">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-[4px] border-border overflow-hidden flex-shrink-0">
            <img
              src={meta.image}
              alt={meta.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-headline font-black uppercase tracking-tighter text-2xl md:text-4xl truncate">
              {meta.name}
            </p>
            <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px] mt-2">
              {songs.length} songs
              {albums.length > 0 && ` · ${albums.length} albums`}
            </p>
            <button
              type="button"
              onClick={playArtistRadio}
              disabled={radioLoading}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-neo-yellow text-black font-headline font-bold uppercase text-xs tracking-widest border-[2px] border-border hover:brightness-110 transition-all disabled:opacity-50"
            >
              {radioLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5" />
              )}
              {t('artistRadio')}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <div className="flex gap-6 px-6 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`font-headline font-bold uppercase text-xs tracking-widest transition-colors pb-1 ${
                tab === t.key
                  ? 'text-foreground'
                  : 'text-foreground/30 hover:text-foreground/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <AppSkeletonTheme>
          <div className="px-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="flex items-center gap-4 px-4 py-3">
                <Skeleton width={20} height={12} />
                <Skeleton width={40} height={40} />
                <div className="flex-1 min-w-0">
                  <Skeleton width="55%" height={12} />
                  <Skeleton width="35%" height={9} style={{ marginTop: 4 }} />
                </div>
                <Skeleton width={30} height={9} />
              </div>
            ))}
          </div>
        </AppSkeletonTheme>
      )}

      {/* Overview Tab */}
      {!loading && tab === 'overview' && (
        <div className="px-6 space-y-6">
          {songs.length > 0 && (
            <div>
              <h3 className="font-headline font-black uppercase tracking-widest text-xs text-foreground/40 mb-2">
                Top Songs
              </h3>
              {songs.slice(0, 5).map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  songs={songs}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  play={play}
                  togglePlay={togglePlay}
                />
              ))}
            </div>
          )}

          {albums.length > 0 && (
            <div>
              <h3 className="font-headline font-black uppercase tracking-widest text-xs text-foreground/40 mb-2">
                Top Albums
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {albums.slice(0, 4).map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Songs Tab */}
      {!loading && tab === 'songs' && (
        <div className="px-6">
          {songs.slice(0, songsVisible).map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              songs={songs}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              play={play}
              togglePlay={togglePlay}
            />
          ))}
          {songsVisible < songs.length && (
            <button
              type="button"
              onClick={() => setSongsVisible((v) => v + 50)}
              className="w-full py-4 text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-xs tracking-widest transition-colors"
            >
              {t('loadMore')}
            </button>
          )}
          {songs.length === 0 && <EmptyState text={t('noSongs')} />}
        </div>
      )}

      {/* Albums Tab */}
      {!loading && tab === 'albums' && (
        <div className="px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
          {albumsHasMore && (
            <button
              type="button"
              onClick={loadMoreAlbums}
              disabled={albumsLoading}
              className="w-full py-4 text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-xs tracking-widest transition-colors disabled:opacity-30"
            >
              {albumsLoading ? t('loading') : t('loadMore')}
            </button>
          )}
          {albums.length === 0 && <EmptyState text={t('noAlbums')} />}
        </div>
      )}
    </div>
  );
}

function SongRow({
  song,
  index,
  songs,
  currentTrack,
  isPlaying,
  play,
  togglePlay,
}: {
  song: MusicTrack;
  index: number;
  songs: MusicTrack[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  play: (track: MusicTrack, queue?: MusicTrack[]) => void;
  togglePlay: () => void;
}) {
  const isActive = currentTrack?.id === song.id;

  return (
    <button
      type="button"
      onClick={() => (isActive ? togglePlay() : play(song, songs))}
      onContextMenu={(e) => showSongMenu(e, song)}
      className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card"
    >
      <span className="w-6 text-foreground/20 text-xs font-mono text-right flex-shrink-0">
        {isActive && isPlaying ? (
          <Pause className="w-3.5 h-3.5 text-neo-yellow fill-current inline" />
        ) : isActive ? (
          <Play className="w-3.5 h-3.5 text-neo-yellow fill-current inline ml-0.5" />
        ) : (
          index + 1
        )}
      </span>
      <img
        src={song.image}
        alt={song.title}
        className="w-10 h-10 border-[2px] border-border object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-headline font-bold text-sm uppercase tracking-wider truncate ${isActive ? 'text-neo-yellow' : ''}`}
        >
          {song.title}
        </p>
        <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
          {song.album}
        </p>
      </div>
      <span className="text-foreground/20 text-[10px] font-mono flex-shrink-0">
        {formatTime(song.duration)}
      </span>
    </button>
  );
}

function AlbumCard({ album }: { album: MusicArtistAlbum }) {
  return (
    <Link href={`/music/album/${album.id}`} className="group">
      <div className="relative">
        <div className="absolute inset-0 bg-neo-yellow translate-x-1 translate-y-1 border-[3px] border-border" />
        <div className="relative border-[3px] border-border overflow-hidden bg-card">
          <img
            src={album.image}
            alt={album.title}
            className="w-full aspect-square object-cover"
          />
        </div>
      </div>
      <p className="font-headline font-bold text-xs uppercase tracking-wider mt-2 truncate">
        {album.title}
      </p>
      <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
        {album.year > 0 && `${album.year} · `}
        {album.songCount} songs
      </p>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-foreground/20 font-headline uppercase tracking-widest text-xs py-12 text-center">
      {text}
    </p>
  );
}
