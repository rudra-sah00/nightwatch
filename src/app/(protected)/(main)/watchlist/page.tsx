import type { Metadata } from 'next';
import WatchlistClient from './WatchlistClient';

export const metadata: Metadata = {
  title: 'My Watchlist | Watch Rudra',
  description: 'Keep track of movies and TV shows you want to watch later.',
};

export default async function WatchlistPage() {
  // Artificial delay to showcase premium loading animations
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <WatchlistClient />;
}
