'use client';

import { Music } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getUserPlaylists, type UserPlaylist } from '@/features/music/api';
import { ScrollRow, Section } from './MusicPrimitives';

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
