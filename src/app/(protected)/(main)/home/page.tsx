import type { Metadata } from 'next';
import { HomeClient } from '@/features/search/components/HomeClient';

export const metadata: Metadata = {
  title: 'Home | Watch Rudra',
  description: 'Search for movies and TV shows to start watching together.',
};

export default async function HomePage() {
  // Artificial delay to showcase premium loading animations
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return <HomeClient />;
}
