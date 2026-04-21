import type { Metadata } from 'next';
import { HomeClient } from '@/features/search/components/HomeClient';

export const metadata: Metadata = {
  title: 'Home | Watch Rudra',
  description: 'Search for movies and TV shows to start watching together.',
};

export default async function HomePage() {
  return <HomeClient />;
}
