import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import DownloadsClient from './DownloadsClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return { title: t('downloadsTitle'), description: t('downloadsDescription') };
}

export default async function DownloadsPage() {
  return <DownloadsClient />;
}
