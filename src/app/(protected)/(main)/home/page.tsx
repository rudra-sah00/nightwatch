import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ExploreHub } from '@/features/hub/components/ExploreHub';
import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvHome } from '@/platforms/smart-tv/pages/TvHome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export default async function HomePage() {
  return (
    <TvPageGate tvContent={<TvHome />}>
      <ExploreHub />
    </TvPageGate>
  );
}
