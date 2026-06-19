'use client';

import dynamic from 'next/dynamic';
import { MiniPlayer } from '@/features/music/components/MiniPlayer';
import { useMusicStore } from '@/features/music/store/use-music-store';

const SongContextMenu = dynamic(
  () =>
    import('@/features/music/components/SongContextMenu').then(
      (m) => m.SongContextMenu,
    ),
  { ssr: false },
);

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
