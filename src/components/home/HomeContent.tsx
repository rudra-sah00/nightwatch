'use client';

import { LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ContentDetailModal } from '@/components/content';
import { ProfileBadge } from '@/components/profile';
import SearchBar from '@/components/search/SearchBar';
import { Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { SearchResult } from '@/lib/api';
import type { ContentType } from '@/types/content';

interface HomeContentProps {
  results: SearchResult[];
  loading: boolean;
  searched: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

// Selected content for the modal
interface SelectedContent {
  id: string;
  title: string;
  type: ContentType;
  poster?: string;
  year?: number;
}

export function HomeContent({
  results,
  loading,
  searched,
  searchQuery,
  onSearch,
  onClear,
}: HomeContentProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Handle content card click - open modal
  const handleContentClick = (result: SearchResult) => {
    setSelectedContent({
      id: result.id,
      title: result.title,
      type: result.type || 'Movie',
      poster: result.poster,
      year: result.year,
    });
  };

  // Handle play from modal - navigate first to prevent flash
  const handlePlay = async (episodeId?: string) => {
    if (!selectedContent) return;

    // Navigate first before closing modal to prevent seeing search results flash
    if (episodeId) {
      // Series episode - navigate to episode
      router.push(`/watch/${selectedContent.id}?episode=${episodeId}`);
    } else {
      // Movie - navigate directly
      router.push(`/watch/${selectedContent.id}`);
    }
    // Small delay to let navigation start before closing modal
    setTimeout(() => setSelectedContent(null), 100);
  };

  return (
    <>
      {/* Content Detail Modal */}
      {selectedContent && (
        <ContentDetailModal
          id={selectedContent.id}
          title={selectedContent.title}
          type={selectedContent.type}
          poster={selectedContent.poster}
          year={selectedContent.year}
          onClose={() => setSelectedContent(null)}
          onPlay={handlePlay}
        />
      )}

      {/* Fixed Header Section - Always visible */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Welcome, {user?.name || user?.username}
              </h1>
              <p className="text-lg text-zinc-400 mt-2">Search for movies and TV shows</p>
            </div>

            {/* Search bar and logout button */}
            <div className="flex gap-3 items-center justify-center max-w-3xl mx-auto">
              <div className="flex-1">
                <SearchBar
                  onSearch={onSearch}
                  onClear={onClear}
                  initialQuery={searchQuery}
                  useUrlNavigation={true}
                />
              </div>

              {/* Profile Badge */}
              <ProfileBadge />

              <Button
                variant="outline"
                onClick={handleLogout}
                className="bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 gap-2 backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {searched && (
        <div className="px-6 pb-12 max-w-7xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">
              {loading ? 'Searching...' : `Results for "${searchQuery}"`}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'].map((skeletonId) => (
                <div key={skeletonId} className="flex gap-4 p-4 bg-zinc-900/50 rounded-lg">
                  <Skeleton className="w-36 aspect-video rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result) => (
                <button
                  type="button"
                  key={result.id}
                  onClick={() => handleContentClick(result)}
                  className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-zinc-800/50 transition-colors group text-left"
                >
                  {/* Poster */}
                  <div className="relative w-36 aspect-video rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.poster}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg font-medium text-white mb-2 line-clamp-1">
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 mb-2">
                      {result.year && <span>{result.year}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-1 ring-zinc-700/50 shadow-xl">
                <Search className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                We couldn&apos;t find any movies or TV shows matching &quot;{searchQuery}&quot;. Try
                a different search term.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
