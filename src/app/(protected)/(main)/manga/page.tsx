import type { Metadata } from 'next';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { MangaClient } from '@/features/manga/components/MangaClient';
import { MangaTvGate } from './MangaTvGate';

export const metadata: Metadata = { title: 'Manga' };

export default function MangaPage() {
  return (
    <FeatureErrorBoundary feature="Manga">
      <MangaTvGate>
        <MangaClient />
      </MangaTvGate>
    </FeatureErrorBoundary>
  );
}
