import type { Metadata } from 'next';
import { MangaClient } from '@/features/manga/components/MangaClient';

export const metadata: Metadata = { title: 'Manga' };

export default function MangaPage() {
  return <MangaClient />;
}
