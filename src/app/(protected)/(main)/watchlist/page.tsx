import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import WatchlistClient from './WatchlistClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return { title: t('watchlistTitle'), description: t('watchlistDescription') };
}

export default async function WatchlistPage() {
  return <WatchlistClient />;
}
