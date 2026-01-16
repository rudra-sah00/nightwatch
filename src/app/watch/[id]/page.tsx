'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import { getVideoData, getShowDetails, getEpisodeData, getSeriesEpisodes } from '@/lib/api/media';
import { ArrowLeftIcon, PlayIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownSelector } from '@/components/ui/dropdown-selector';
import type { CompleteVideoData, ShowDetails, Episode } from '@/types/content';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videoData, setVideoData] = useState<CompleteVideoData | null>(null);
  const [showDetails, setShowDetails] = useState<ShowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = React.useRef(false);
  const fetchedSeasons = React.useRef<Set<number>>(new Set());
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  // Get episode from query params if present
  const episodeId = searchParams.get('episode');

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get video data for playback (includes metadata in video.metadata)
        let response;
        if (episodeId) {
          // If we have an episode ID, get episode stream data
          response = await getEpisodeData(resolvedParams.id, episodeId);
        } else {
          response = await getVideoData(resolvedParams.id);
        }

        if (!response.data?.video) {
          setError('Failed to load video');
          return;
        }

        setVideoData(response.data.video);

        // Load show details for series to get episodes list
        if (response.data.video.metadata.content_type === 'Series') {
          try {
            const showResponse = await getShowDetails(resolvedParams.id);
            if (showResponse.data?.show) {
              setShowDetails(showResponse.data.show);
              
              // Set initial season based on current episode or last season
              if (episodeId && showResponse.data.show.episodes) {
                const currentEp = showResponse.data.show.episodes.find(ep => ep.episode_id === episodeId);
                if (currentEp?.season_number) {
                  setSelectedSeason(currentEp.season_number);
                }
              } else if (showResponse.data.show.seasons && showResponse.data.show.seasons.length > 0) {
                const lastSeason = showResponse.data.show.seasons[showResponse.data.show.seasons.length - 1];
                setSelectedSeason(lastSeason.season_number || 1);
              }
            }
          } catch (err) {
            console.error('Failed to load show details:', err);
          }
        }
      } catch (err) {
        console.error('Error loading video:', err);
        setError('An error occurred while loading the video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [resolvedParams.id, episodeId]);

  // Fetch episodes when season changes (like ContentDetailModal)
  useEffect(() => {
    // Skip if we already fetched this season
    if (fetchedSeasons.current.has(selectedSeason)) {
      // Just filter the already loaded episodes
      if (showDetails?.episodes) {
        const filtered = showDetails.episodes.filter(ep => ep.season_number === selectedSeason);
        setSeasonEpisodes(filtered);
      }
      return;
    }

    const selectedSeasonInfo = showDetails?.seasons?.find(s => s.season_number === selectedSeason);

    if (showDetails?.content_type === 'Series' && selectedSeasonInfo) {
      // Mark this season as fetched to prevent duplicate requests
      fetchedSeasons.current.add(selectedSeason);

      const fetchSeasonEpisodes = async () => {
        try {
          const response = await getSeriesEpisodes(resolvedParams.id, selectedSeasonInfo.season_id);
          if (response.data && response.data.episodes) {
            const newEps = response.data.episodes;
            // Update showDetails episodes with new episodes
            setShowDetails(prev => {
              if (!prev) return prev;
              const existingIds = new Set(prev.episodes.map(e => e.episode_id));
              const newEpisodes = newEps.filter(e => !existingIds.has(e.episode_id));
              return {
                ...prev,
                episodes: [...prev.episodes, ...newEpisodes]
              };
            });
            // Update filtered episodes for display
            setSeasonEpisodes(newEps);
          }
        } catch (err) {
          console.error('Failed to fetch season episodes:', err);
          // On error, allow retry by removing from fetched set
          fetchedSeasons.current.delete(selectedSeason);
        }
      };
      fetchSeasonEpisodes();
    } else if (showDetails?.episodes) {
      // Not a series or no season info, just filter
      const filtered = showDetails.episodes.filter(ep => ep.season_number === selectedSeason);
      setSeasonEpisodes(filtered);
    }
  }, [showDetails, selectedSeason, resolvedParams.id]);

  // Prepare seasons array for dropdown (grouped episodes by season)
  const groupedSeasons: [number, Episode[]][] = React.useMemo(() => {
    if (!showDetails?.episodes || !showDetails?.seasons) {
      return [];
    }
    
    // Create groups based on ALL seasons from API, not just loaded episodes
    const groups = new Map<number, Episode[]>();
    
    // Initialize all seasons from API
    showDetails.seasons.forEach(season => {
      const seasonNum = season.season_number || 1;
      groups.set(seasonNum, []);
    });
    
    // Add episodes to their respective seasons
    showDetails.episodes.forEach(ep => {
      const season = ep.season_number || 1;
      if (!groups.has(season)) {
        groups.set(season, []);
      }
      groups.get(season)!.push(ep);
    });
    
    const result = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    return result;
  }, [showDetails?.episodes, showDetails?.seasons]);

  // Get current episode info
  const currentEpisode = episodeId ? showDetails?.episodes?.find(ep => ep.episode_id === episodeId) : undefined;

  // Display title - use video metadata which has all the data
  const metadata = videoData?.metadata;
  const displayTitle = metadata?.title || showDetails?.title || 'Loading...';
  const displayYear = metadata?.year || showDetails?.year;
  const displayDescription = currentEpisode?.description || showDetails?.description;
  const displayGenre = metadata?.genre?.join(', ') || showDetails?.genre;
  const displayCast = metadata?.cast || showDetails?.cast;
  const displayRating = metadata?.rating || showDetails?.rating;
  const displayQuality = showDetails?.quality;
  const displayDuration = metadata?.duration; // in minutes

  // Parse episode info from title if it's a series
  const parseEpisodeTitle = (title: string) => {
    // Format: "Series Name - S5E7: Episode Title"
    const match = title.match(/^(.+?)\s*-\s*S(\d+)E(\d+):\s*(.+)$/);
    if (match) {
      return {
        seriesName: match[1],
        season: parseInt(match[2]),
        episode: parseInt(match[3]),
        episodeTitle: match[4],
      };
    }
    return null;
  };

  const episodeInfo = episodeId && metadata?.content_type === 'Series' ? parseEpisodeTitle(displayTitle) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="container mx-auto px-4 pt-6">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-zinc-300 text-xl font-medium">{error || 'Video not found'}</p>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-white text-black font-semibold hover:bg-zinc-200 rounded-full transition-all hover:scale-105 shadow-lg"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all group px-4 py-2 rounded-full hover:bg-white/5"
        >
          <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Video Player - Full Width */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <VideoPlayer
            src={videoData.master_playlist_url}
            poster={videoData.metadata.poster_url}
            title={displayTitle}
            subtitles={videoData.subtitles?.map(s => ({
              language: s.language_name || s.language,
              url: s.vtt_url,
            }))}
            spriteSheets={videoData.sprite_sheets?.map(s => ({
              spriteUrl: s.sprite_url,
              spriteWidth: s.sprite_width,
              spriteHeight: s.sprite_height,
              tileWidth: s.tile_width,
              tileHeight: s.tile_height,
              tilesPerRow: s.tiles_per_row,
              totalTiles: s.total_tiles,
              intervalSeconds: s.interval_seconds,
            }))}
          />
        </div>

        {/* Video Info Card */}
        <div className="mt-8 pb-12">
          {/* Episode Info for Series */}
          {episodeInfo ? (
            <>
              {/* Series Name */}
              <div className="mb-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {episodeInfo.seriesName}
                </h2>
              </div>
              
              {/* Season/Episode Badge and Episode Title */}
              <div className="flex items-start gap-4 mb-4">
                <Badge 
                  variant="secondary" 
                  className="bg-red-600 hover:bg-red-700 text-white border-0 px-3 py-1.5 text-sm font-semibold"
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
              {/* Episode Title (if watching an episode with legacy format) */}
              {currentEpisode && !episodeInfo && (
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">
                    S{currentEpisode.season_number} E{currentEpisode.episode_number}
                  </Badge>
                  <h2 className="text-xl text-zinc-300 font-medium">{currentEpisode.title}</h2>
                </div>
              )}

              {/* Main Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {displayTitle}
              </h1>
            </>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {displayYear && (
              <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                {displayYear}
              </Badge>
            )}
            {displayDuration && metadata?.content_type === 'Movie' && (
              <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                {Math.floor(displayDuration / 60)}h {displayDuration % 60}m
              </Badge>
            )}
            {displayRating && (
              <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                ⭐ {typeof displayRating === 'number' ? displayRating.toFixed(1) : displayRating}
              </Badge>
            )}
            {displayQuality && (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                {displayQuality}
              </Badge>
            )}
            {showDetails?.content_type === 'Series' && showDetails?.runtime && (
              <Badge variant="outline" className="text-zinc-300 border-zinc-700">
                {showDetails.runtime}
              </Badge>
            )}
          </div>

          {/* Genre Pills */}
          {displayGenre && (
            <div className="flex flex-wrap gap-2 mt-4">
              {displayGenre.split(',').map((genre, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-sm bg-zinc-800/80 text-zinc-300 rounded-full border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                >
                  {genre.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {displayDescription && (
            <div className="mt-6">
              <h3 className="text-zinc-500 text-sm uppercase tracking-wider mb-2">
                {episodeInfo ? 'Episode Description' : 'Description'}
              </h3>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-4xl">
                {displayDescription}
              </p>
            </div>
          )}

          {/* Cast - Only show if not an episode description */}
          {displayCast && !episodeInfo && (
            <div className="mt-6">
              <h3 className="text-zinc-500 text-sm uppercase tracking-wider mb-2">Cast</h3>
              <p className="text-zinc-300">{displayCast}</p>
            </div>
          )}

          {/* Episodes List - Only for Series */}
          {(showDetails?.content_type === 'Series' || metadata?.content_type === 'Series') && 
           showDetails?.seasons && showDetails.seasons.length > 0 && (
            <div className="mt-12 border-t border-zinc-800 pt-8">
              {/* Season Selector */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Episodes</h2>
                <DropdownSelector
                  options={groupedSeasons.map(([seasonNum, eps]) => {
                    const seasonInfo = showDetails.seasons?.find(s => s.season_number === seasonNum);
                    return {
                      value: seasonNum,
                      label: `Season ${seasonNum}`,
                      count: seasonInfo?.episode_count ?? eps.length,
                    };
                  })}
                  selectedValue={selectedSeason}
                  isOpen={showSeasonDropdown}
                  onToggle={() => setShowSeasonDropdown(!showSeasonDropdown)}
                  onSelect={(season) => {
                    setSelectedSeason(season);
                    setShowSeasonDropdown(false);
                  }}
                />
              </div>

              {/* Episodes Grid */}
              <div className="grid grid-cols-1 gap-3">
                {seasonEpisodes.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    No episodes available for this season
                  </div>
                ) : (
                  seasonEpisodes.map((episode, index) => {
                    const isCurrentEpisode = episode.episode_id === episodeId;
                    return (
                      <button
                        key={episode.episode_id}
                        onClick={() => {
                          if (!isCurrentEpisode) {
                            router.push(`/watch/${resolvedParams.id}?episode=${episode.episode_id}`);
                          }
                        }}
                        className={`group flex gap-4 p-4 rounded-lg transition-all ${
                          isCurrentEpisode
                            ? 'bg-zinc-800 border-2 border-red-600'
                            : 'bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* Episode Thumbnail */}
                        <div className="relative flex-shrink-0 w-40 h-24 bg-zinc-800 rounded-lg overflow-hidden">
                          <img
                            src={episode.thumbnail_url}
                            alt={episode.title || `Episode ${episode.episode_number}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"%3E%3Crect fill="%2327272a" width="160" height="90"/%3E%3C/svg%3E';
                            }}
                          />
                          {isCurrentEpisode ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <CheckIcon className="w-8 h-8 text-red-600" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayIcon className="w-8 h-8 text-white" />
                            </div>
                          )}
                          {episode.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white">
                              {episode.duration}m
                            </div>
                          )}
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className={`text-sm font-semibold ${
                                  isCurrentEpisode ? 'text-red-600' : 'text-zinc-400'
                                }`}>
                                  {episode.episode_number}
                                </span>
                                <h3 className={`text-lg font-semibold truncate ${
                                  isCurrentEpisode ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                                }`}>
                                  {episode.title || `Episode ${episode.episode_number}`}
                                </h3>
                              </div>
                              {episode.description && (
                                <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                                  {episode.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
