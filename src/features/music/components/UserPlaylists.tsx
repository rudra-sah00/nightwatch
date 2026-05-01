'use client';

import { Music } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
 * Renders `null` when the user has no playlists, keeping the home page clean.
 * The parent ({@link MusicSections}) uses a React `key` prop to force-remount
 * this component after a new playlist is created.
 */
export function UserPlaylists() {
  const t = useTranslations('music');
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  useEffect(() => {
    getUserPlaylists()
      .then(setPlaylists)
      .catch(() => {});
  }, []);

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
              {pl.trackCount} {t('tracks')}
            </p>
          </Link>
        ))}
      </ScrollRow>
    </Section>
  );
}
