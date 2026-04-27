'use client';

import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getMusicAlbum, type MusicTrack } from '@/features/music/api';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const player = useMusicPlayerContext();
  const t = useTranslations('music');
  const [songs, setSongs] = useState<MusicTrack[]>([]);
  const [meta, setMeta] = useState<{
    title: string;
    image: string;
    artist: string;
    year: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMusicAlbum(id)
      .then((data) => {
        setSongs(data.songs);
        setMeta({
          title: data.title,
          image: data.image,
          artist: data.artist,
          year: data.year,
        });
        document.title = `${data.title} — Nightwatch`;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-[3px] border-foreground/10 border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="px-6">
          {songs.map((song, i) => (
            <button
              key={song.id}
              type="button"
              onClick={() =>
                player.currentTrack?.id === song.id
                  ? player.togglePlay()
                  : player.play(song, songs)
              }
              className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                player.currentTrack?.id === song.id
                  ? 'bg-neo-yellow/10 border-[2px] border-neo-yellow/30'
                  : 'hover:bg-card border-[2px] border-transparent'
              }`}
            >
              <span className="w-6 text-foreground/20 text-xs font-mono text-right flex-shrink-0">
                {player.currentTrack?.id === song.id && player.isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-neo-yellow fill-current inline" />
                ) : player.currentTrack?.id === song.id ? (
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
                  className={`font-headline font-bold text-sm uppercase tracking-wider truncate ${player.currentTrack?.id === song.id ? 'text-neo-yellow' : ''}`}
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
    </div>
  );
}
