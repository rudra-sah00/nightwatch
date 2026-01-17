'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { HomeContent } from '@/components/home';

function HomePage() {
  const router = useRouter();

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      // Navigate to the search page with the query
      router.push(`/search/${encodeURIComponent(query.trim())}`);
    },
    [router]
  );

  const handleClear = useCallback(() => {
    // Already on home page, nothing to clear
  }, []);

  return (
    <HomeContent
      results={[]}
      loading={false}
      searched={false}
      searchQuery=""
      onSearch={handleSearch}
      onClear={handleClear}
    />
  );
}

export default function Home() {
  return <HomePage />;
}
