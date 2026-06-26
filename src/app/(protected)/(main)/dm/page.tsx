import type { Metadata } from 'next';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { ExploreShell } from '@/features/explore/components/ExploreShell';

export const metadata: Metadata = {
  title: 'Messages',
};

export default function DMPage() {
  return (
    <FeatureErrorBoundary feature="Messages">
      <ExploreShell />
    </FeatureErrorBoundary>
  );
}
