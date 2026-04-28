'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getRadioSongs, getRadioStations } from '@/features/music/api';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';

const LANGUAGES = [
  'hindi',
  'tamil',
  'telugu',
  'english',
  'punjabi',
  'marathi',
  'kannada',
] as const;
type RadioItem = { id: string; title: string; image: string; language: string };

export default function MusicRadioLangPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('music');
  const lang = (params.lang as string) || 'hindi';
  const [stations, setStations] = useState<RadioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const player = useMusicPlayerContext();

  const handlePlayStation = async (station: RadioItem) => {
    setPlayingStation(station.id);
    try {
      const songs = await getRadioSongs(station.title);
      if (songs.length > 0) {
        player.play(songs[0], songs);
      } else {
        toast.error('No songs available');
      }
    } catch {
      toast.error('Failed to load station');
    } finally {
      setPlayingStation(null);
    }
  };

  useEffect(() => {
    document.title = `${lang.charAt(0).toUpperCase() + lang.slice(1)} Radio — Nightwatch`;
    setLoading(true);
    getRadioStations(lang)
      .then((data) => setStations(data.filter((s) => s.language === lang)))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, [lang]);

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

      <div className="px-6 pt-4 pb-2">
        <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter">
          {t('radioStations')}
        </h1>
      </div>

      {/* Language links */}
      <div className="flex gap-3 px-6 mb-4 flex-wrap">
        {LANGUAGES.map((l) => (
          <Link
            key={l}
            href={`/music/radio/${l}`}
            className={`shrink-0 font-headline font-bold uppercase text-xs tracking-widest transition-colors ${
              lang === l
                ? 'text-foreground'
                : 'text-foreground/40 hover:text-foreground'
            }`}
          >
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </Link>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-[3px] border-foreground/10 border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      {!loading && stations.length > 0 && (
        <div className="px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stations.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handlePlayStation(r)}
                disabled={playingStation === r.id}
                className="text-center cursor-pointer"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-neo-yellow translate-x-1 translate-y-1 border-[3px] border-border" />
                  <div className="relative border-[3px] border-border overflow-hidden bg-card">
                    <img
                      src={r.image}
                      alt={r.title}
                      className="w-full aspect-square object-cover"
                    />
                    {playingStation === r.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-5 h-5 border-[2px] border-white/20 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
                  {r.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && stations.length === 0 && (
        <p className="text-foreground/20 font-headline uppercase tracking-widest text-xs py-12 text-center">
          {t('noStations')}
        </p>
      )}
    </div>
  );
}
