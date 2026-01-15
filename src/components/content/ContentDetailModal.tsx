'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getVideoData, getShowDetails, getSeriesEpisodes, getPosterUrl, searchImdb } from '@/lib/api/media';
import type { ContentType, Episode, CompleteVideoData, VideoMetadata, ShowDetails, Season } from '@/types/content';

// Sub-components
import HeroSection from './HeroSection';
import MetadataSection from './MetadataSection';
import SeasonSelector from './SeasonSelector';
import EpisodesList from './EpisodesList';

interface ContentDetailModalProps {
  id: string;
  title: string;
  type: ContentType;
  poster?: string;
  year?: number;
  onClose: () => void;
  onPlay: (episodeId?: string) => void;
}

export default function ContentDetailModal({
  id,
  title,
  type,
  poster,
  year,
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
  const hasFetched = useRef(false);
  const imdbFetched = useRef(false);

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
            setSelectedSeason(show.seasons[0]?.season_number || 1);
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
      } catch (err) {
        console.error('Failed to fetch content data:', err);
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
      } catch (err) {
        console.warn('IMDB search failed:', err);
      }
    };

    fetchImdb();
  }, [title, showDetails]);

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
      return seasonsList.map(s => [s.season_number, episodes.filter(e => e.season_number === s.season_number)] as [number, Episode[]]);
    }

    if (episodes.length === 0) return [];

    const seasonMap = new Map<number, Episode[]>();
    episodes.forEach(ep => {
      const season = ep.season_number || 1;
      if (!seasonMap.has(season)) {
        seasonMap.set(season, []);
      }
      seasonMap.get(season)!.push(ep);
    });

    return Array.from(seasonMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [episodes, seasonsList]);

  const currentSeasonEpisodes = seasons.find(([s]) => s === selectedSeason)?.[1] || [];

  // Fetch episodes when season changes
  useEffect(() => {
    const currentSeasonHasEpisodes = episodes.some(e => e.season_number === selectedSeason);
    const selectedSeasonInfo = seasonsList.find(s => s.season_number === selectedSeason);

    if (actualType === 'Series' && seasonsList.length > 0 && !currentSeasonHasEpisodes && selectedSeasonInfo) {
      const fetchSeasonEpisodes = async () => {
        try {
          const response = await getSeriesEpisodes(id, selectedSeasonInfo.season_id);
          if (response.data && response.data.episodes) {
            const newEps = response.data.episodes;
            setEpisodes(prev => {
              const existingIds = new Set(prev.map(e => e.episode_id));
              const newEpisodes = newEps.filter(e => !existingIds.has(e.episode_id));
              return [...prev, ...newEpisodes];
            });
          }
        } catch (err) {
          console.error('Failed to fetch season episodes:', err);
        }
      };
      fetchSeasonEpisodes();
    }
  }, [selectedSeason, seasonsList, actualType, episodes, id]);

  const posterUrl = poster || getPosterUrl(id, true);

  const handlePlay = () => {
    onPlay(actualType === 'Series' && episodes[0] ? episodes[0].episode_id : undefined);
  };

  const handleSeasonSelect = (season: number) => {
    setSelectedSeason(season);
    setShowSeasonDropdown(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mb-20 rounded-xl bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Hero Section */}
        <HeroSection posterUrl={posterUrl} title={title} onPlay={handlePlay} />

        {/* Content Details */}
        <div className="px-12 py-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
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
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  showDropdown={showSeasonDropdown}
                  onToggleDropdown={() => setShowSeasonDropdown(!showSeasonDropdown)}
                  onSelectSeason={handleSeasonSelect}
                  currentSeasonEpisodes={currentSeasonEpisodes}
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
