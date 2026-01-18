'use client';

import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DropdownSelector } from '@/components/ui/dropdown-selector';
import { analytics } from '@/services/analytics';
import {
  getPosterUrl,
  getSeriesEpisodes,
  getShowDetails,
  getVideoData,
  searchImdb,
} from '@/services/api/media';
import { type ContinueWatchingItem, getContentProgress } from '@/services/api/watchProgress';
import type {
  CompleteVideoData,
  ContentType,
  Episode,
  Season,
  ShowDetails,
  VideoMetadata,
} from '@/types/content';
import EpisodesList from './EpisodesList';
// Sub-components
import HeroSection from './HeroSection';
import MetadataSection from './MetadataSection';

interface ContentDetailModalProps {
  id: string;
  title: string;
  type: ContentType;
  poster?: string;
  year?: number;
  // Resume info - pre-populated from Continue Watching
  resumeProgress?: ContinueWatchingItem;
  onClose: () => void;
  onPlay: (episodeId?: string, resumeTime?: number) => void;
}

export default function ContentDetailModal({
  id,
  title,
  type,
  poster,
  year,
  resumeProgress,
  onClose,
  onPlay,
}: ContentDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<ShowDetails | null>(null);
  const [videoData, setVideoData] = useState<CompleteVideoData | null>(null);
  const [imdbData, setImdbData] = useState<VideoMetadata | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualType, setActualType] = useState<ContentType>(type);
  // Watch progress state
  const [watchProgress, setWatchProgress] = useState<ContinueWatchingItem | null>(
    resumeProgress || null
  );
  const hasFetched = useRef(false);
  const imdbFetched = useRef(false);
  const progressFetched = useRef(false);
  const fetchedSeasons = useRef<Set<number>>(new Set());

  // Analytics - View Content
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      analytics.content.view({ id, title, type });
    }
  }, [id, title, type]);

  // Fetch show details (proper API - no hit-and-trial)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const showResponse = await getShowDetails(id);

        if (showResponse.data) {
          const show = showResponse.data.show;
          setShowDetails(show);
          setActualType(show.content_type);

          if (show.seasons && show.seasons.length > 0) {
            setSeasonsList(show.seasons);
            // Default to latest/last season
            const lastSeason = show.seasons[show.seasons.length - 1];
            setSelectedSeason(lastSeason?.season_number || 1);
          }

          if (show.episodes && show.episodes.length > 0) {
            setEpisodes(show.episodes);
          }
        } else {
          // Fallback to old method
          const videoResponse = await getVideoData(id);
          if (videoResponse.data) {
            const video = videoResponse.data.video;
            setVideoData(video);
            setActualType(video.metadata.content_type);
            if (video.episodes && video.episodes.length > 0) {
              setEpisodes(video.episodes);
            }
          }
        }
      } catch {
        setError('Failed to load content details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch IMDB data (non-blocking)
  useEffect(() => {
    if (imdbFetched.current || !title || !showDetails) return;
    imdbFetched.current = true;

    const fetchImdb = async () => {
      try {
        const imdbResponse = await searchImdb(title);
        if (imdbResponse.data) {
          setImdbData(imdbResponse.data);
        }
      } catch {
        // IMDB search failed silently
      }
    };

    fetchImdb();
  }, [title, showDetails]);

  // Fetch watch progress (non-blocking) - only if not provided via props
  useEffect(() => {
    if (progressFetched.current || resumeProgress) return;
    progressFetched.current = true;

    const fetchProgress = async () => {
      try {
        // For movies, just fetch by content_id
        // For series, we need to check the most recent episode progress
        const response = await getContentProgress(id);
        if (response.progress && response.progress.progress_seconds > 10) {
          setWatchProgress(response.progress);
        }
      } catch {
        // Progress fetch failed silently - not critical
      }
    };

    fetchProgress();
  }, [id, resumeProgress]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Group episodes by season
  const seasons = React.useMemo(() => {
    if (seasonsList.length > 0) {
      return seasonsList.map(
        (s) =>
          [s.season_number, episodes.filter((e) => e.season_number === s.season_number)] as [
            number,
            Episode[],
          ]
      );
    }

    if (episodes.length === 0) return [];

    const seasonMap = new Map<number, Episode[]>();
    for (const ep of episodes) {
      const season = ep.season_number || 1;
      if (!seasonMap.has(season)) {
        seasonMap.set(season, []);
      }
      seasonMap.get(season)?.push(ep);
    }

    return Array.from(seasonMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [episodes, seasonsList]);

  const currentSeasonEpisodes = seasons.find(([s]) => s === selectedSeason)?.[1] || [];

  // Fetch episodes when season changes
  useEffect(() => {
    // Skip if we already fetched this season
    if (fetchedSeasons.current.has(selectedSeason)) return;

    const selectedSeasonInfo = seasonsList.find((s) => s.season_number === selectedSeason);

    if (actualType === 'Series' && seasonsList.length > 0 && selectedSeasonInfo) {
      // Mark this season as fetched to prevent duplicate requests
      fetchedSeasons.current.add(selectedSeason);

      const fetchSeasonEpisodes = async () => {
        try {
          const response = await getSeriesEpisodes(id, selectedSeasonInfo.season_id);
          if (response.data?.episodes) {
            const newEps = response.data.episodes;
            setEpisodes((prev) => {
              const existingIds = new Set(prev.map((e) => e.episode_id));
              const newEpisodes = newEps.filter((e) => !existingIds.has(e.episode_id));
              return [...prev, ...newEpisodes];
            });
          }
        } catch {
          // On error, allow retry by removing from fetched set
          fetchedSeasons.current.delete(selectedSeason);
        }
      };
      fetchSeasonEpisodes();
    }
  }, [selectedSeason, seasonsList, actualType, id]);

  const posterUrl = poster || getPosterUrl(id, true);

  // Handle play - with resume time if available
  const handlePlay = () => {
    if (watchProgress) {
      // Resume from where we left off
      onPlay(watchProgress.episode_id || undefined, watchProgress.progress_seconds);
    } else {
      // Start fresh - first episode for series, no episode for movies
      onPlay(actualType === 'Series' && episodes[0] ? episodes[0].episode_id : undefined);
    }
  };

  // Handle fresh play (ignore resume)
  const handlePlayFresh = () => {
    onPlay(actualType === 'Series' && episodes[0] ? episodes[0].episode_id : undefined);
  };

  const handleSeasonSelect = (season: number) => {
    setSelectedSeason(season);
    setShowSeasonDropdown(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        role="document"
        className="relative w-full max-w-5xl mb-20 rounded-xl bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Hero Section */}
        <HeroSection
          posterUrl={posterUrl}
          title={title}
          watchProgress={watchProgress}
          onPlay={handlePlay}
          onPlayFresh={handlePlayFresh}
        />

        {/* Content Details */}
        <div className="px-12 py-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-amber-400">{error}</p>
            </div>
          ) : (
            <MetadataSection
              showDetails={showDetails}
              imdbData={imdbData}
              videoData={videoData}
              seasonsCount={seasons.length}
              actualType={actualType}
              year={year}
            />
          )}

          {/* Series Episodes */}
          {actualType === 'Series' && episodes.length > 0 && (
            <div className="pt-8 mt-6 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold">Episodes</h3>
                <DropdownSelector
                  options={seasons.map(([seasonNum, eps]) => {
                    const seasonInfo = seasonsList.find((s) => s.season_number === seasonNum);
                    return {
                      value: seasonNum,
                      label: `Season ${seasonNum}`,
                      count: seasonInfo?.episode_count ?? eps.length,
                    };
                  })}
                  selectedValue={selectedSeason}
                  isOpen={showSeasonDropdown}
                  onToggle={() => setShowSeasonDropdown(!showSeasonDropdown)}
                  onSelect={handleSeasonSelect}
                />
              </div>
              <EpisodesList
                episodes={currentSeasonEpisodes}
                posterUrl={posterUrl}
                onPlay={onPlay}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
