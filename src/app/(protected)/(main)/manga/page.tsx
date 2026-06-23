import type { Metadata } from 'next';
import { MangaClient } from '@/features/manga/components/MangaClient';
import { MangaTvGate } from './MangaTvGate';

export const metadata: Metadata = { title: 'Manga' };

export default function MangaPage() {
  return (
    <MangaTvGate>
      <MangaClient />
    </MangaTvGate>
  );
}
