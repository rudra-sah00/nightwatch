'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageTitle } from '@/components/layout/page-title';
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
  const t = useTranslations('common.nav');

  return (
    <>
      <PageTitle title={t('music')} href="/music" />
      {children}
      {!expanded && <MiniPlayer />}
      <SongContextMenu />
    </>
  );
}
