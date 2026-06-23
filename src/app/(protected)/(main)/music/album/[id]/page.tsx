'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import { getAlbumRecommendations, getMusicAlbum } from '@/features/music/api';
import { showSongMenu } from '@/features/music/components/SongContextMenu';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvMusicDetail } from '@/platforms/smart-tv/pages/TvMusicDetail';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const t = useTranslations('music');

  const { data: album, isLoading: loading } = useQuery({
    queryKey: ['music', 'album', id],
    queryFn: () => getMusicAlbum(id),
    enabled: !!id,
  });

  const { data: recoAlbums = [] } = useQuery({
    queryKey: ['music', 'album', id, 'recommendations'],
    queryFn: () => getAlbumRecommendations(id),
    enabled: !!id,
  });

  const songs = album?.songs ?? [];

  // TV: D-pad optimized track list
  if (isTV()) {
    return (
      <TvMusicDetail
        title={album?.title ?? 'Album'}
        image={album?.image}
        subtitle={album?.artist}
        songs={songs}
        isLoading={loading}
      />
    );
  }

  const meta = album
    ? {
        title: album.title,
        image: album.image,
        artist: album.artist,
        year: album.year,
      }
    : null;

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
          <div className="w-40 h-40 md:w-52 md:h-52 border-[4px] border-border overflow-hidden flex-shrink-0">
            <img
              src={meta.image}
              alt={meta.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-headline font-black uppercase tracking-tighter text-2xl md:text-4xl truncate">
              {meta.title}
            </p>
            {meta.artist && (
              <p className="text-foreground/40 font-headline font-bold uppercase tracking-widest text-xs mt-1">
                {meta.artist}
              </p>
            )}
            <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px] mt-2">
              {meta.year > 0 && `${meta.year} · `}
              {songs.length} songs
            </p>
          </div>
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

      {!loading && (
        <div className="px-6">
          {songs.map((song, i) => (
            <button
              key={song.id}
              type="button"
              onClick={() =>
                currentTrack?.id === song.id ? togglePlay() : play(song, songs)
              }
              onContextMenu={(e) => showSongMenu(e, song)}
              className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card"
            >
              <span className="w-6 text-foreground/20 text-xs font-mono text-right flex-shrink-0">
                {currentTrack?.id === song.id && isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-neo-yellow fill-current inline" />
                ) : currentTrack?.id === song.id ? (
                  <Play className="w-3.5 h-3.5 text-neo-yellow fill-current inline ml-0.5" />
                ) : (
                  i + 1
                )}
              </span>
              <img
                src={song.image}
                alt={song.title}
                className="w-10 h-10 border-[2px] border-border object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-headline font-bold text-sm uppercase tracking-wider truncate ${currentTrack?.id === song.id ? 'text-neo-yellow' : ''}`}
                >
                  {song.title}
                </p>
                <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
                  {song.artist}
                </p>
              </div>
              <span className="text-foreground/20 text-[10px] font-mono flex-shrink-0">
                {formatTime(song.duration)}
              </span>
            </button>
          ))}
        </div>
      )}

      {recoAlbums.length > 0 && (
        <div className="px-6 mt-8 mb-4">
          <p className="font-headline font-black uppercase tracking-widest text-[10px] text-foreground/30 mb-3">
            Similar Albums
          </p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {recoAlbums.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => router.push(`/music/album/${a.id}`)}
                className="flex-shrink-0 w-32 text-left"
              >
                <div className="w-32 h-32 border-[3px] border-border overflow-hidden hover:border-neo-yellow transition-colors">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
                  {a.title}
                </p>
                <p className="text-foreground/30 text-[10px] font-headline uppercase tracking-wider truncate">
                  {a.artist}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
