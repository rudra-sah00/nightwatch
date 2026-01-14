'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { getVideoSources, PlaylistResponse } from '@/lib/api/media-api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [movieTitle, setMovieTitle] = useState<string>('');

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get movie title from URL params if available
        const urlParams = new URLSearchParams(window.location.search);
        const title = urlParams.get('title') || movieTitle || '';
        
        console.log('[WatchPage] Loading video:', resolvedParams.id, 'with title:', title);
        const sources = await getVideoSources(resolvedParams.id, title);
        console.log('[WatchPage] Received playlist data:', sources);
        
        if (!sources) {
          setError('Failed to load video sources');
          return;
        }

        // Check if sources array exists and has items
        if (!sources.sources || sources.sources.length === 0) {
          console.error('No video sources found in response:', sources);
          setError('No video sources available');
          return;
        }

        setPlaylist(sources);
        if (sources.title) {
          setMovieTitle(sources.title);
        }
      } catch (err) {
        console.error('[WatchPage] Error loading video:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading the video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [resolvedParams.id, movieTitle]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-600 mb-4"></div>
            <p className="text-amber-700 text-lg">Loading video...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-amber-800 text-xl mb-4">{error || 'Video not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-md"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-amber-700 hover:text-amber-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Back
      </button>

      {/* Video Player */}
      <div className="max-w-6xl mx-auto">
        <VideoPlayer
          src={playlist.sources?.[selectedQuality]?.url || playlist.sources?.[0]?.url || ''}
          poster={playlist.poster}
          title={playlist.title}
          subtitles={playlist.subtitles}
          thumbnailsUrl={playlist.thumbnails?.url}
        />

        {/* Video Info */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold mb-4 text-amber-950">{playlist.title}</h1>

          {/* Quality Selector */}
          {playlist.sources && playlist.sources.length > 1 && (
            <div className="mb-6">
              <label className="text-amber-800 text-sm mb-2 block font-medium">Quality:</label>
              <div className="flex gap-2">
                {playlist.sources.map((source, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedQuality(index)}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      selectedQuality === index
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {source.quality}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtitle Options */}
          {playlist.subtitles && playlist.subtitles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-amber-800 text-sm mb-2 font-medium">Available Subtitles:</h3>
              <div className="flex flex-wrap gap-2">
                {playlist.subtitles.map((sub, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                  >
                    {sub.language}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
