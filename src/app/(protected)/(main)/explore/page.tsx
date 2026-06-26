import type { Metadata } from 'next';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { ExploreShell } from '@/features/explore/components/ExploreShell';

export const metadata: Metadata = {
  title: 'Explore',
};

export default function ExplorePage() {
  return (
    <FeatureErrorBoundary feature="Explore">
      <ExploreShell />
    </FeatureErrorBoundary>
  );
}
