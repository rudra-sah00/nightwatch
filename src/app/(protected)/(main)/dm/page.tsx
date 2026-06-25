import type { Metadata } from 'next';
import { ExploreShell } from '@/features/explore/components/ExploreShell';

export const metadata: Metadata = {
  title: 'Messages',
};

export default function DMPage() {
  return <ExploreShell />;
}
