'use client';

import { MiniPlayer } from '@/features/music/components/MiniPlayer';
import { SongContextMenu } from '@/features/music/components/SongContextMenu';
import { useMusicStore } from '@/features/music/store/use-music-store';

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const expanded = useMusicStore((s) => s.expanded);

  return (
    <>
      {children}
      {!expanded && <MiniPlayer />}
      <SongContextMenu />
    </>
  );
}
