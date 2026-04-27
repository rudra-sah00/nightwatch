'use client';

import { MiniPlayer } from '@/features/music/components/MiniPlayer';
import { SongContextMenu } from '@/features/music/components/SongContextMenu';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { expanded } = useMusicPlayerContext();

  return (
    <>
      {children}
      {!expanded && <MiniPlayer />}
      <SongContextMenu />
    </>
  );
}
