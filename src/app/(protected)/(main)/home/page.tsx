import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeClient } from '@/features/search/components/HomeClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export default async function HomePage() {
  return <HomeClient />;
}
