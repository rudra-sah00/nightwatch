import type { Metadata } from 'next';
import { DiscoverView } from '@/features/music-discover/components/DiscoverView';

export const metadata: Metadata = {
  title: 'Discover Music | Nightwatch',
};

export default function DiscoverPage() {
  return <DiscoverView />;
}
