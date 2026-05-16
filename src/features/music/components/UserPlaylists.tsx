'use client';

import { Music } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import ReactSkeleton from 'react-loading-skeleton';
import { AppSkeletonTheme } from '@/components/ui/skeleton-theme';
import { getUserPlaylists, type UserPlaylist } from '@/features/music/api';
import { ScrollRow, Section } from './MusicPrimitives';

/**
 * Horizontal scroll section displaying the authenticated user's custom playlists.
 *
 * Fetches playlists from `getUserPlaylists` on mount and renders them as
 * {@link Card}-style tiles inside a {@link Section} / {@link ScrollRow} layout.
 * Each tile links to the playlist detail page (`/music/playlist-user/:id`).
 * Playlists without a cover image show a fallback music icon.
 *
 * Shows a skeleton loader while fetching. Renders `null` only after loading
 * confirms the user has no playlists, keeping the home page clean.
 * The parent ({@link MusicSections}) uses a React `key` prop to force-remount
 * this component after a new playlist is created.
 */
export function UserPlaylists() {
  const t = useTranslations('music');
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserPlaylists()
      .then(setPlaylists)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppSkeletonTheme>
        <div className="px-6 mt-4">
          <ReactSkeleton width={90} height={10} style={{ marginBottom: 12 }} />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-36 md:w-40">
                <ReactSkeleton className="w-36 md:w-40 aspect-square" />
                <ReactSkeleton
                  width="70%"
                  height={8}
                  style={{ marginTop: 8 }}
                />
              </div>
            ))}
          </div>
        </div>
      </AppSkeletonTheme>
    );
  }

  if (playlists.length === 0) return null;

  return (
    <Section title={t('myPlaylists')}>
      <ScrollRow>
        {playlists.map((pl) => (
          <Link
            key={pl.id}
            href={`/music/playlist-user/${pl.id}`}
            className="flex-shrink-0 w-36 md:w-40 cursor-pointer"
          >
            <div className="aspect-square bg-card border-[3px] border-border overflow-hidden flex items-center justify-center hover:border-neo-yellow transition-colors">
              {pl.coverUrl ? (
                <img
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-10 h-10 text-foreground/20" />
              )}
            </div>
            <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
              {pl.name}
            </p>
            <p className="text-foreground/30 text-[10px] font-headline uppercase tracking-wider truncate">
              {t('tracks', { count: pl.trackCount })}
            </p>
          </Link>
        ))}
      </ScrollRow>
    </Section>
  );
}
