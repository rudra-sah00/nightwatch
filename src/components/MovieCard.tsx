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
    <Link href={`/watch/${id}`} className="group relative block">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 transition-transform duration-300 group-hover:scale-105">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <span className="text-zinc-600 text-sm">No Image</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayIcon className="w-12 h-12 text-white" />
        </div>

        {type && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-900/80 text-white text-xs font-medium rounded">
            {type}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-zinc-300 transition-colors">
          {title}
        </h3>
        {year && (
          <p className="text-zinc-500 text-xs">{year}</p>
        )}
      </div>
    </Link>
  );
}
