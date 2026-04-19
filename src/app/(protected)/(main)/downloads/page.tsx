import type { Metadata } from 'next';
import DownloadsClient from './DownloadsClient';

export const metadata: Metadata = {
  title: 'Downloads | Watch Rudra',
  description:
    'Access your downloaded movies and TV shows for offline viewing.',
};

export default async function DownloadsPage() {
  // Artificial delay to showcase premium loading animations
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <DownloadsClient />;
}
