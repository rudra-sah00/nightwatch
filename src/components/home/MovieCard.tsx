'use client';

import { Film, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MovieCardProps {
  id: string;
  title: string;
  poster?: string;
  year?: number;
  type?: string;
}

export default function MovieCard({ id, title, poster, year, type }: MovieCardProps) {
  return (
    <Link href={`/watch/${id}`} className="group relative block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-white/50 group-hover:shadow-xl group-hover:shadow-white/10">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover transition-all duration-500 group-hover:brightness-75"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Film className="w-8 h-8 text-zinc-600" />
            <span className="text-zinc-500 text-xs font-medium">No Image</span>
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-white flex items-center justify-center',
              'transform scale-75 group-hover:scale-100 transition-all duration-300',
              'shadow-lg shadow-white/30',
              'ring-2 ring-white/20'
            )}
          >
            <Play className="w-6 h-6 text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Type badge */}
        {type && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs bg-black/60 backdrop-blur-sm border-none">
              {type}
            </Badge>
          </div>
        )}

        {/* Bottom gradient for text visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Title section */}
      <div className="mt-3 space-y-1">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-zinc-300 transition-colors duration-200">
          {title}
        </h3>
        {year && <p className="text-zinc-500 text-xs font-medium">{year}</p>}
      </div>
    </Link>
  );
}
