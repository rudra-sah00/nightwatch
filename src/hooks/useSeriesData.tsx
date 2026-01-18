'use client';

import { useEffect, useRef, useState } from 'react';
import { getSeriesEpisodes, getShowDetails } from '@/services/api/media';
import type { Episode, ShowDetails } from '@/types/content';

interface UseSeriesDataProps {
  contentId: string;
  episodeId?: string | null;
  contentType?: string;
}

export function useSeriesData({ contentId, episodeId, contentType }: UseSeriesDataProps) {
  const [showDetails, setShowDetails] = useState<ShowDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const fetchedSeasons = useRef<Set<number>>(new Set());
  const initialSeasonSet = useRef<boolean>(false);
  const initialEpisodeId = useRef<string | null | undefined>(episodeId);

  // Load show details for series
  useEffect(() => {
    if (contentType !== 'Series') return;

    const controller = new AbortController();

    const loadShowDetails = async () => {
      try {
        const showResponse = await getShowDetails(contentId, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (showResponse.data?.show) {
          setShowDetails(showResponse.data.show);

          // Set initial season based on current episode (PRIORITY: current episode's season)
          // Only do this once when we first load
          if (!initialSeasonSet.current) {
            initialSeasonSet.current = true;

            const epId = initialEpisodeId.current;
            if (epId && showResponse.data.show.episodes) {
              const currentEp = showResponse.data.show.episodes.find(
                (ep) => ep.episode_id === epId
              );
              if (currentEp?.season_number) {
                setSelectedSeason(currentEp.season_number);
                return; // Season set from current episode
              }
            }

            // Fallback: if no episode ID or episode not found, use last season
            if (showResponse.data.show.seasons && showResponse.data.show.seasons.length > 0) {
              const lastSeason =
                showResponse.data.show.seasons[showResponse.data.show.seasons.length - 1];
              setSelectedSeason(lastSeason.season_number || 1);
            }
          }
        }
      } catch {
        // Show details fetch failed silently
      }
    };

    loadShowDetails();

    return () => {
      controller.abort();
    };
  }, [contentId, contentType]);

  // Update selected season when episodeId changes (e.g., navigating to different episode)
  useEffect(() => {
    if (!episodeId || !showDetails?.episodes) return;

    const currentEp = showDetails.episodes.find((ep) => ep.episode_id === episodeId);
    if (currentEp?.season_number && currentEp.season_number !== selectedSeason) {
      setSelectedSeason(currentEp.season_number);
    }
  }, [episodeId, showDetails?.episodes, selectedSeason]);

  // Fetch episodes when season changes
  useEffect(() => {
    // Skip if we already fetched this season
    if (fetchedSeasons.current.has(selectedSeason)) {
      // Just filter the already loaded episodes
      if (showDetails?.episodes) {
        const filtered = showDetails.episodes.filter((ep) => ep.season_number === selectedSeason);
        setSeasonEpisodes(filtered);
      }
      return;
    }

    const selectedSeasonInfo = showDetails?.seasons?.find(
      (s) => s.season_number === selectedSeason
    );

    if (showDetails?.content_type === 'Series' && selectedSeasonInfo) {
      const controller = new AbortController();

      // Mark this season as fetched to prevent duplicate requests
      fetchedSeasons.current.add(selectedSeason);

      const fetchSeasonEpisodes = async () => {
        try {
          const response = await getSeriesEpisodes(contentId, selectedSeasonInfo.season_id, {
            signal: controller.signal,
          });

          if (controller.signal.aborted) {
            // If aborted, remove from fetched set so we can retry later
            fetchedSeasons.current.delete(selectedSeason);
            return;
          }

          if (response.data?.episodes) {
            const newEps = response.data.episodes;
            // Update showDetails episodes with new episodes
            setShowDetails((prev) => {
              if (!prev) return prev;
              const existingIds = new Set(prev.episodes.map((e) => e.episode_id));
              const newEpisodes = newEps.filter((e) => !existingIds.has(e.episode_id));
              return {
                ...prev,
                episodes: [...prev.episodes, ...newEpisodes],
              };
            });
            // Update filtered episodes for display
            setSeasonEpisodes(newEps);
          } else {
            // Request failed (api error), allow retry
            fetchedSeasons.current.delete(selectedSeason);
          }
        } catch {
          // On error, allow retry
          fetchedSeasons.current.delete(selectedSeason);
        }
      };

      fetchSeasonEpisodes();

      return () => controller.abort();
    } else if (showDetails?.episodes) {
      // Not a series or no season info, just filter
      const filtered = showDetails.episodes.filter((ep) => ep.season_number === selectedSeason);
      setSeasonEpisodes(filtered);
    }
  }, [showDetails, selectedSeason, contentId]);

  return {
    showDetails,
    selectedSeason,
    setSelectedSeason,
    seasonEpisodes,
  };
}
