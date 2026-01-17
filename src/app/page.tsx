'use client';

import React, { useState, useCallback } from 'react';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { search, SearchResult } from '@/lib/api';

function HomePage() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setSearchQuery(query);
    setSearched(true);

    try {
      const response = await search(query);
      setResults(response.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setResults([]);
    setSearchQuery('');
    setSearched(false);
  }, []);

  return (
    <HomeContent
      results={results}
      loading={loading}
      searched={searched}
      searchQuery={searchQuery}
      onSearch={handleSearch}
      onClear={handleClear}
    />
  );
}

export default function Home() {
  return (
    <HomePage />
  );
}
