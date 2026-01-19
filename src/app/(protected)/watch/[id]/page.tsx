'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { WatchPage } from '@/features/watch/page/WatchPage';
import { VideoMetadata } from '@/features/watch/player/types';

function WatchContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const movieId = params.id as string;
    const type = (searchParams.get('type') || 'movie') as 'movie' | 'series';
    const title = searchParams.get('title') || 'Unknown';
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');
    const description = searchParams.get('description');
    const year = searchParams.get('year');
    const poster = searchParams.get('poster');

    // Get the stream URL from query params (passed from play response)
    const streamParam = searchParams.get('stream');
    const streamUrl = streamParam ? decodeURIComponent(streamParam) : null;

    // Get the caption URL from query params
    const captionParam = searchParams.get('caption');
    const captionUrl = captionParam ? decodeURIComponent(captionParam) : null;

    // Get the sprite URL from query params
    const spriteParam = searchParams.get('sprite');
    const spriteVtt = spriteParam ? decodeURIComponent(spriteParam) : undefined;

    // Decode poster URL
    const posterUrl = poster ? decodeURIComponent(poster) : undefined;

    const metadata: VideoMetadata = {
        title: decodeURIComponent(title),
        type,
        season: season ? parseInt(season) : undefined,
        episode: episode ? parseInt(episode) : undefined,
        movieId,
        description: description ? decodeURIComponent(description) : undefined,
        year: year ? decodeURIComponent(year) : undefined,
        posterUrl,
    };

    // No stream URL provided
    if (!streamUrl) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                    <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-white text-xl font-semibold mb-2">No Stream Available</h2>
                <p className="text-white/60 mb-6">Please start playback from the content page</p>
                <button
                    onClick={() => router.push('/home')}
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    return (
        <WatchPage
            movieId={movieId}
            streamUrl={streamUrl}
            metadata={metadata}
            captionUrl={captionUrl}
            spriteVtt={spriteVtt}
            description={description ? decodeURIComponent(description) : undefined}
        />
    );
}

export default function WatchRoutePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-white animate-spin" />
            </div>
        }>
            <WatchContent />
        </Suspense>
    );
}

