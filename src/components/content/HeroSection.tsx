'use client';

import React from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

interface HeroSectionProps {
    posterUrl: string;
    title: string;
    onPlay: () => void;
}

export default function HeroSection({ posterUrl, title, onPlay }: HeroSectionProps) {
    return (
        <div className="relative aspect-video w-full">
            <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-transparent to-transparent" />

            {/* Action buttons - Bottom left */}
            <div className="absolute bottom-16 left-12 right-12">
                <div className="flex items-center gap-3">
                    <button
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-md hover:bg-white/90 transition-colors font-semibold text-lg"
                        onClick={onPlay}
                    >
                        <Play className="w-6 h-6 fill-current" />
                        Play
                    </button>
                </div>
            </div>
        </div>
    );
}
