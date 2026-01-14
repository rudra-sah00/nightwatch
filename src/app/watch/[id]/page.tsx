'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import { getVideoSources, VideoSourcesResponse } from '@/lib/api/media';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface WatchPageData extends VideoSourcesResponse {
  title?: string;
  poster?: string;
}

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [playlist, setPlaylist] = useState<WatchPageData | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('Video');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Extract title from query params or use default
        const urlParams = new URLSearchParams(window.location.search);
        const title = urlParams.get('title') || 'Video';
        setVideoTitle(title);

        const response = await getVideoSources(resolvedParams.id, title);
        if (!response.data) {
          setError('Failed to load video sources');
          return;
        }

        setPlaylist({
          ...response.data,
          title,
        });
      } catch (err) {
        console.error('Error loading video:', err);
        setError('An error occurred while loading the video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-zinc-400 text-lg">Loading video...</p>
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
            <p className="text-zinc-400 text-xl mb-4">{error || 'Video not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>
      </div>

      {/* Video Player - Full Width */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <VideoPlayer
          src={playlist.sources?.[0]?.url || ''}
          poster={playlist.poster}
          title={videoTitle}
        />

        {/* Video Info */}
        <div className="mt-8 pb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white">{videoTitle}</h1>
        </div>
      </div>
    </div>
  );
}
