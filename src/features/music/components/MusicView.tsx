'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeletons';
import {
  getCharts,
  getFeaturedPlaylists,
  getNewReleases,
  getRadioStations,
  getTopArtists,
  getTopPodcasts,
} from '@/features/music/api';
import { Card, ScrollRow, Section } from './MusicPrimitives';
import { MusicSearchSpotlight } from './MusicSearchSpotlight';

type ChartItem = { id: string; title: string; image: string };
type ArtistItem = { id: string; name: string; image: string };
type ReleaseItem = { id: string; title: string; artist: string; image: string };
type RadioItem = { id: string; title: string; image: string; language: string };

export function MusicView() {
  const t = useTranslations('music');
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [featured, setFeatured] = useState<ChartItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [podcasts, setPodcasts] = useState<ChartItem[]>([]);
  const [radio, setRadio] = useState<RadioItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter">
          {t('title')}
        </h1>
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
          aria-label={t('searchMusic')}
        >
          <Search className="w-4 h-4 text-foreground/50" />
        </button>
      </div>

      {loading && <MusicSkeleton />}

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
    <div className="space-y-6 py-4">
      {[1, 2, 3, 4].map((section) => (
        <div key={section}>
          <div className="px-6 mb-3">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex gap-4 px-6 overflow-hidden">
            {[1, 2, 3, 4, 5].map((card) => (
              <div key={card} className="flex-shrink-0 w-36 md:w-40">
                <Skeleton className="w-36 h-36 md:w-40 md:h-40" />
                <Skeleton className="h-2.5 mt-2 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
