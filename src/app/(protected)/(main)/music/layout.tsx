'use client';

import { MiniPlayer } from '@/features/music/components/MiniPlayer';
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
    </>
  );
}
