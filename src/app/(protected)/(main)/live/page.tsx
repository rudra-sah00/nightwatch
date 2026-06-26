import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import LiveClient from './LiveClient';
import { LiveTvGate } from './LiveTvGate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('liveTitle'),
    description: t('liveDescription'),
  };
}

export default async function LivePage() {
  return (
    <FeatureErrorBoundary feature="Livestream">
      <LiveTvGate>
        <LiveClient />
      </LiveTvGate>
    </FeatureErrorBoundary>
  );
}
