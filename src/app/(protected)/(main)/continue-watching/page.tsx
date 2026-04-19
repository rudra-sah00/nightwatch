import type { Metadata } from 'next';
import ContinueWatchingClient from './ContinueWatchingClient';

export const metadata: Metadata = {
  title: 'Continue Watching | Watch Rudra',
  description:
    'Pick up where you left off with your recently watched movies and TV shows.',
};

export default async function ContinueWatchingPage() {
  return <ContinueWatchingClient />;
}
