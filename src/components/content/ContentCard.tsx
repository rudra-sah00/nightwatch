'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Film, Tv, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPosterUrl } from '@/services/api/media';
import type { ContentType } from '@/types/content';

interface ContentCardProps {
  id: string;
  title: string;
  poster?: string;
  year?: number;
  type: ContentType;
  onClick?: () => void;
}

export default function ContentCard({
  id,
  title,
  poster,
  year,
  type,
  onClick
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false);

  // Use backend poster URL pattern if no poster provided
  const posterUrl = poster || getPosterUrl(id);
  const fallbackPoster = getPosterUrl(id, true); // HD fallback

  return (
    <div
      className="group relative block cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-white/50 group-hover:shadow-xl group-hover:shadow-white/10">
        {!imageError ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover transition-all duration-500 group-hover:brightness-75"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900">
            {type === 'Series' ? (
              <Tv className="w-8 h-8 text-zinc-600" />
            ) : (
              <Film className="w-8 h-8 text-zinc-600" />
            )}
            <span className="text-zinc-500 text-xs font-medium">No Image</span>
          </div>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Play/Info button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "w-14 h-14 rounded-full bg-white/90 flex items-center justify-center",
              "transform scale-75 group-hover:scale-100 transition-all duration-300",
              "shadow-lg hover:bg-white"
            )}>
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>

          {/* Info button at bottom */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs backdrop-blur-sm border-none",
              type === 'Series'
                ? "bg-blue-600/80 text-white"
                : "bg-white/80 text-black"
            )}
          >
            {type === 'Series' ? (
              <><Tv className="w-3 h-3 mr-1" />Series</>
            ) : (
              <><Film className="w-3 h-3 mr-1" />Movie</>
            )}
          </Badge>
        </div>

        {/* Bottom gradient for text visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Title section */}
      <div className="mt-3 space-y-1">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-zinc-300 transition-colors duration-200">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {year && (
            <p className="text-zinc-500 text-xs font-medium">{year}</p>
          )}
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            type === 'Series' ? "text-blue-400 bg-blue-500/10" : "text-zinc-400 bg-zinc-500/10"
          )}>
            {type}
          </span>
        </div>
      </div>
    </div>
  );
}
