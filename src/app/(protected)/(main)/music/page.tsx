import type { Metadata } from 'next';
import { MusicView } from '@/features/music/components/MusicView';
import { MusicTvGate } from './MusicTvGate';

export const metadata: Metadata = {
  title: 'Music | Nightwatch',
};

export default function MusicPage() {
  return (
    <MusicTvGate>
      <MusicView />
    </MusicTvGate>
  );
}
