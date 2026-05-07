import type { Metadata } from 'next';
import { RemoteControlPage } from '@/features/remote-control/components/RemoteControlSheet';

export const metadata: Metadata = {
  title: 'Remote Control',
};

export default function RemotePage() {
  return <RemoteControlPage />;
}
