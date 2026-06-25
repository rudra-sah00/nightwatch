import type { Metadata } from 'next';
import { ExploreShell } from '@/features/explore/components/ExploreShell';

export const metadata: Metadata = {
  title: 'Explore',
};

export default function ExplorePage() {
  return <ExploreShell />;
}
