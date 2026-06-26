'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import {
  getPodcastEpisodes,
  getPodcastShow,
  type PodcastEpisode,
} from '@/features/music/api';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { formatTime } from '@/features/music/utils';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvMusicDetail } from '@/platforms/smart-tv/pages/TvMusicDetail';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PodcastPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const play = useMusicStore((s) => s.play);
  const t = useTranslations('music');

  const { data: show = null, isLoading: loading } = useQuery({
    queryKey: ['music', 'podcast', id],
    queryFn: () => getPodcastShow(id),
    enabled: !!id,
  });

  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (show) {
      setEpisodes(show.episodes);
      setHasMore(show.episodes.length >= 10);
      if (show.seasons.length > 0) {
        setActiveSeason(show.seasons.length);
      }
    }
  }, [show]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    getPodcastEpisodes(id, activeSeason, nextPage)
      .then((eps) => {
        setEpisodes((prev) => [...prev, ...eps]);
        setPage(nextPage);
        setHasMore(eps.length >= 20);
      })
      .catch(() => {});
  }, [id, activeSeason, page]);

  const changeSeason = useCallback(
    (season: number) => {
      setActiveSeason(season);
      setPage(1);
      setEpisodes([]);
      getPodcastEpisodes(id, season, 1)
        .then((eps) => {
          setEpisodes(eps);
          setHasMore(eps.length >= 20);
        })
        .catch(() => {});
    },
    [id],
  );

  const episodeToTrack = useCallback(
    (ep: PodcastEpisode) => ({
      id: `podcast:${ep.encryptedMediaUrl}`,
      title: ep.title,
      artist: show?.title || '',
      album: show?.title || '',
      albumId: '',
      duration: ep.duration,
      image: ep.image,
      language: '',
      year: 0,
      hasLyrics: false,
    }),
    [show],
  );

  const playEpisode = useCallback(
    (episode: PodcastEpisode) => {
      const queue = episodes.map(episodeToTrack);
      const track = episodeToTrack(episode);
      play(track, queue);
    },
    [episodes, episodeToTrack, play],
  );

  // TV: show episodes as track list
  if (isTV() && show) {
    const tvSongs = episodes.map(
      (ep) =>
        ({
          id: ep.id,
          title: ep.title,
          artist: show.title,
          album: show.title,
          albumId: id,
          duration: ep.duration ?? 0,
          image: ep.image || show.image,
          language: '',
          year: 0,
        }) as unknown as import('@/features/music/types').MusicTrack,
    );
    return (
      <TvMusicDetail
        title={show.title}
        image={show.image}
        subtitle={show.description?.slice(0, 50)}
        songs={tvSongs}
        isLoading={loading}
      />
    );
  }

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

      {show && (
        <div className="flex items-end gap-6 px-6 py-6">
          <div className="w-40 h-40 md:w-52 md:h-52 border-[4px] border-border overflow-hidden flex-shrink-0 rounded-xl">
            <img
              src={show.image}
              alt={show.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-headline font-black uppercase tracking-tighter text-2xl md:text-4xl truncate">
              {show.title}
            </p>
            {show.description && (
              <p className="text-foreground/40 text-xs mt-2 line-clamp-3">
                {show.description}
              </p>
            )}
            <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px] mt-2">
              {show.seasons.length > 0 && `${show.seasons.length} seasons · `}
              {episodes.length} episodes
            </p>
          </div>
        </div>
      )}

      {/* Seasons tabs */}
      {show && show.seasons.length > 1 && (
        <div className="flex gap-2 px-6 mb-4">
          {show.seasons.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => changeSeason(i + 1)}
              className={`px-3 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest rounded-full transition-colors ${
                activeSeason === i + 1
                  ? 'bg-neo-yellow text-foreground border-[2px] border-border'
                  : 'text-foreground/40 hover:text-foreground'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <AppSkeletonTheme>
          <div className="px-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-4 px-4 py-3">
                <Skeleton width={40} height={40} />
                <div className="flex-1 min-w-0">
                  <Skeleton width="55%" height={12} />
                  <Skeleton width="75%" height={9} style={{ marginTop: 4 }} />
                </div>
                <Skeleton width={40} height={9} />
              </div>
            ))}
          </div>
        </AppSkeletonTheme>
      )}

      {!loading && (
        <div className="px-6">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              type="button"
              onClick={() => playEpisode(ep)}
              className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card"
            >
              <div className="w-10 h-10 border-[2px] border-border overflow-hidden flex-shrink-0 rounded relative">
                <img
                  src={ep.image}
                  alt={ep.title}
                  className="w-full h-full object-cover"
                />
                {currentTrack?.id === `podcast:${ep.encryptedMediaUrl}` && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-neo-yellow fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-neo-yellow fill-current" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-headline font-bold text-sm uppercase tracking-wider truncate ${currentTrack?.id === `podcast:${ep.encryptedMediaUrl}` ? 'text-neo-yellow' : ''}`}
                >
                  {ep.title}
                </p>
                <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
                  {ep.subtitle || formatDate(ep.releaseDate)}
                </p>
              </div>
              <span className="text-foreground/20 text-[10px] font-mono flex-shrink-0">
                {formatTime(ep.duration)}
              </span>
            </button>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              className="w-full py-3 text-center text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-[10px] tracking-widest transition-colors"
            >
              {t('loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
