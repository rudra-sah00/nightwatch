import type { Metadata } from 'next';
import { MusicView } from '@/features/music/components/MusicView';

export const metadata: Metadata = {
  title: 'Music | Nightwatch',
};

export default function MusicPage() {
  return <MusicView />;
}
