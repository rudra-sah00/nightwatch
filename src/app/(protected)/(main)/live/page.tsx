import type { Metadata } from 'next';
import LiveClient from './LiveClient';

export const metadata: Metadata = {
  title: 'Live Matches | Watch Rudra',
  description:
    'Watch live sports matches and channels with your friends in real-time.',
};

export default async function LivePage() {
  // Artificial delay to showcase premium loading animations
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <LiveClient />;
}
