'use client';

import type { ContentType, ShowDetails, VideoMetadata } from '@/types/content';

interface MetadataSectionProps {
  showDetails: ShowDetails | null;
  imdbData: VideoMetadata | null;
  videoData: { metadata: { genre?: string[]; duration?: number } } | null;
  seasonsCount: number;
  actualType: ContentType;
  year?: number;
}

export default function MetadataSection({
  showDetails,
  imdbData,
  videoData,
  seasonsCount,
  actualType,
  year,
}: MetadataSectionProps) {
  const formatDuration = (minutes: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const displayYear = showDetails?.year || imdbData?.year || year || '2024';
  const displayDuration = imdbData?.duration || videoData?.metadata.duration;
  const displayGenre =
    showDetails?.genre ||
    imdbData?.genre?.join(', ') ||
    videoData?.metadata.genre?.join(', ') ||
    'Drama, Thriller';
  const displayCast = showDetails?.cast || imdbData?.cast;
  const displayDescription = showDetails?.description;
  const displayRating = showDetails?.rating || 'U/A 13+';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Main Info */}
      <div className="lg:col-span-2 space-y-4">
        {/* Metadata Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-green-500 font-semibold">{displayYear}</span>

          {displayDuration && (
            <span className="text-zinc-300">{formatDuration(displayDuration)}</span>
          )}

          {actualType === 'Series' && seasonsCount > 0 && (
            <span className="text-zinc-300">
              {seasonsCount} Season{seasonsCount > 1 ? 's' : ''}
            </span>
          )}

          <span className="px-1.5 py-0.5 border border-zinc-500 text-zinc-400 text-xs font-medium rounded">
            {showDetails?.quality || 'HD'}
          </span>
        </div>

        {/* Age Rating & Genre */}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="px-1.5 py-0.5 border border-zinc-600 text-zinc-400 text-xs">
            {displayRating}
          </span>
          <span className="text-zinc-500">{displayGenre}</span>
        </div>

        {/* Description */}
        <p className="text-zinc-300 text-base leading-relaxed">
          {displayDescription ||
            (displayCast
              ? `Starring ${displayCast}. A captivating story that will keep you on the edge of your seat.`
              : 'A captivating story that will keep you on the edge of your seat.')}
        </p>
      </div>

      {/* Right Column - Cast & Details */}
      <div className="space-y-3 text-sm">
        {displayCast && (
          <p className="text-zinc-400">
            <span className="text-zinc-500">Cast: </span>
            <span className="text-zinc-300 hover:underline cursor-pointer">{displayCast}</span>
          </p>
        )}

        <p className="text-zinc-400">
          <span className="text-zinc-500">Genres: </span>
          <span className="text-zinc-300">{displayGenre}</span>
        </p>

        <p className="text-zinc-400">
          <span className="text-zinc-500">
            This {actualType === 'Series' ? 'series' : 'movie'} is:{' '}
          </span>
          <span className="text-zinc-300">Exciting, Captivating</span>
        </p>

        {imdbData?.imdb_id && (
          <a
            href={`https://www.imdb.com/title/${imdbData.imdb_id}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <span className="font-bold">IMDb</span>
            <span className="text-zinc-500">→</span>
          </a>
        )}
      </div>
    </div>
  );
}
