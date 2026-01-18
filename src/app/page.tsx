'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth';
import { HomeContent } from '@/components/home';
import { type ContinueWatchingItem, getContinueWatching } from '@/services/api/watchProgress';

function HomePage() {
  const router = useRouter();
  const [continueWatchingItems, setContinueWatchingItems] = useState<ContinueWatchingItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pre-fetch continue watching data to avoid "blink"
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await getContinueWatching(20);
        setContinueWatchingItems(response.items);
      } catch (error) {
        console.error('Failed to pre-fetch home data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      router.push(`/search/${encodeURIComponent(query.trim())}`);
    },
    [router]
  );

  const handleClear = useCallback(() => {
    // Already on home page, nothing to clear
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <HomeContent
      results={[]}
      loading={false}
      searched={false}
      searchQuery=""
      onSearch={handleSearch}
      onClear={handleClear}
      initialContinueWatchingItems={continueWatchingItems}
    />
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
