'use client';

import { Badge } from '@/components/ui/badge';
import type { ShowDetails } from '@/types/content';

interface VideoMetadataProps {
  title: string;
  year?: number | string;
  rating?: number | string;
  duration?: number;
  quality?: string;
  runtime?: string;
  genre?: string;
  description?: string;
  cast?: string;
  contentType?: string;
  episodeInfo?: {
    seriesName: string;
    season: number;
    episode: number;
    episodeTitle: string;
  } | null;
  showDetails?: ShowDetails | null;
}

export function VideoMetadata({
  title,
  year,
  rating,
  duration,
  quality,
  runtime,
  genre,
  description,
  cast,
  contentType,
  episodeInfo,
  showDetails,
}: VideoMetadataProps) {
  return (
    <div className="mt-8 pb-12">
      {/* Episode Info for Series */}
      {episodeInfo ? (
        <>
          {/* Series Name */}
          <div className="mb-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{episodeInfo.seriesName}</h2>
          </div>

          {/* Season/Episode Badge and Episode Title */}
          <div className="flex items-start gap-4 mb-4">
            <Badge
              variant="secondary"
              className="bg-white text-black hover:bg-zinc-200 border-0 px-3 py-1.5 text-sm font-semibold"
            >
              S{episodeInfo.season}E{episodeInfo.episode}
            </Badge>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-zinc-100 flex-1">
              {episodeInfo.episodeTitle}
            </h1>
          </div>
        </>
      ) : (
        /* Movie or Series without episode info */
        <>
          {/* Main Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            {title}
          </h1>
        </>
      )}

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {year && (
          <Badge variant="outline" className="text-zinc-300 border-zinc-700">
            {year}
          </Badge>
        )}
        {duration && contentType === 'Movie' && (
          <Badge variant="outline" className="text-zinc-300 border-zinc-700">
            {Math.floor(duration / 60)}h {duration % 60}m
          </Badge>
        )}
        {rating && (
          <Badge variant="outline" className="text-zinc-300 border-zinc-700">
            ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
          </Badge>
        )}
        {quality && (
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            {quality}
          </Badge>
        )}
        {showDetails?.content_type === 'Series' && runtime && (
          <Badge variant="outline" className="text-zinc-300 border-zinc-700">
            {runtime}
          </Badge>
        )}
      </div>

      {/* Genre Pills */}
      {genre && (
        <div className="flex flex-wrap gap-2 mt-4">
          {genre.split(',').map((g) => (
            <span
              key={g.trim()}
              className="px-3 py-1 text-sm bg-zinc-800/80 text-zinc-300 rounded-full border border-zinc-700/50 hover:border-zinc-600 transition-colors"
            >
              {g.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="mt-6">
          <h3 className="text-zinc-500 text-sm uppercase tracking-wider mb-2">
            {episodeInfo ? 'Episode Description' : 'Description'}
          </h3>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-4xl">{description}</p>
        </div>
      )}

      {/* Cast - Only show if not an episode description */}
      {cast && !episodeInfo && (
        <div className="mt-6">
          <h3 className="text-zinc-500 text-sm uppercase tracking-wider mb-2">Cast</h3>
          <p className="text-zinc-300">{cast}</p>
        </div>
      )}
    </div>
  );
}
