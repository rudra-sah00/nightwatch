'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { search, SearchResult } from '@/lib/api/media';
import { ContentDetailModal } from '@/components/content';
import { useAuth } from '@/hooks/useAuth';
import { Button, Skeleton } from '@/components/ui';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import type { ContentType } from '@/types/content';

interface SelectedContent {
    id: string;
    title: string;
    type: ContentType;
    poster?: string;
    year?: number;
}

interface SearchPageProps {
    params: Promise<{ query: string }>;
}

export default function SearchPage({ params }: SearchPageProps) {
    const resolvedParams = use(params);
    const decodedQuery = decodeURIComponent(resolvedParams.query);
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch search results
    useEffect(() => {
        const fetchResults = async () => {
            if (!decodedQuery) return;

            setLoading(true);
            try {
                const response = await search(decodedQuery);
                if (response.data) {
                    setResults(response.data.results);
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [decodedQuery]);

    const handleContentClick = (result: SearchResult) => {
        setSelectedContent({
            id: result.id,
            title: result.title,
            type: result.type || 'Movie',
            poster: result.poster,
            year: result.year,
        });
    };

    const handlePlay = (episodeId?: string) => {
        if (!selectedContent) return;

        if (episodeId) {
            router.push(`/watch/${selectedContent.id}?episode=${episodeId}`);
        } else {
            router.push(`/watch/${selectedContent.id}`);
        }
        setSelectedContent(null);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
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

            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="hover:bg-zinc-800"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold">Search Results</h1>
                            <p className="text-sm text-zinc-400">
                                {loading ? 'Searching...' : `Results for "${decodedQuery}"`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-zinc-900/50 rounded-lg">
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
                                key={result.id}
                                onClick={() => handleContentClick(result)}
                                className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-zinc-800/50 transition-colors group text-left"
                            >
                                {/* Poster */}
                                <div className="relative w-36 aspect-video rounded overflow-hidden flex-shrink-0 bg-zinc-800">
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
                                        <span className="px-2 py-0.5 border border-zinc-600 text-zinc-300 text-xs rounded">
                                            {result.type || 'Movie'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-500 line-clamp-2">
                                        {result.type === 'Series' ? 'TV Series' : 'Movie'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-1 ring-zinc-700/50 shadow-xl">
                            <SearchIcon className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                        <p className="text-zinc-500 text-sm max-w-md mx-auto">
                            We couldn&apos;t find any movies or TV shows matching &quot;{decodedQuery}&quot;. Try a different search term.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
