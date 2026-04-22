import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LiveClient from './LiveClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('liveTitle'),
    description: t('liveDescription'),
  };
}

export default async function LivePage() {
  return <LiveClient />;
}
