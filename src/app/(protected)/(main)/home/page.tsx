import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ExploreHome } from '@/features/search/components/ExploreHome';
import { HomeClient } from '@/features/search/components/HomeClient';
import { TvHomeGate } from './TvHomeGate';
import { WebHomeGate } from './WebHomeGate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export default async function HomePage() {
  return (
    <>
      <TvHomeGate />
      <WebHomeGate>
        <HomeClient />
        <ExploreHome />
      </WebHomeGate>
    </>
  );
}
