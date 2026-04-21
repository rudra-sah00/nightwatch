import type { Metadata } from 'next';
import DownloadsClient from './DownloadsClient';

export const metadata: Metadata = {
  title: 'Downloads | Watch Rudra',
  description:
    'Access your downloaded movies and TV shows for offline viewing.',
};

export default async function DownloadsPage() {
  return <DownloadsClient />;
}
