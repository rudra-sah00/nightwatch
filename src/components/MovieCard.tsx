'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon } from '@heroicons/react/24/solid';

interface MovieCardProps {
  id: string;
  title: string;
  poster?: string;
  year?: number;
  type?: 'movie' | 'series';
}

export default function MovieCard({ id, title, poster, year, type }: MovieCardProps) {
  return (
    <Link href={`/watch/${id}?title=${encodeURIComponent(title)}`} className="group relative block">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-stone-800 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-500">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayIcon className="w-16 h-16 text-amber-500" />
        </div>

        {/* Type badge */}
        {type && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-600 text-stone-900 text-xs font-semibold rounded uppercase shadow-md">
            {type}
          </div>
        )}
      </div>

      {/* Title and year */}
      <div className="mt-2 px-1">
        <h3 className="text-amber-100 font-semibold truncate group-hover:text-amber-400 transition-colors">
          {title}
        </h3>
        {year && (
          <p className="text-stone-400 text-sm">{year}</p>
        )}
      </div>
    </Link>
  );
}
