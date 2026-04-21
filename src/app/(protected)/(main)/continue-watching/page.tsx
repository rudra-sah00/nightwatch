import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ContinueWatchingClient from './ContinueWatchingClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('continueWatchingTitle'),
    description: t('continueWatchingDescription'),
  };
}

export default async function ContinueWatchingPage() {
  return <ContinueWatchingClient />;
}
