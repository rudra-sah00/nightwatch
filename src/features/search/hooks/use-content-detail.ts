'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShowDetails, ContentType, Episode, Season } from '../types';
import { getShowDetails, getSeriesEpisodes, playVideo } from '../api';
import { getSocket } from '@/lib/ws';

interface UseContentDetailOptions {
    contentId: string;
}

interface UseContentDetailReturn {
    // State
    show: ShowDetails | null;
    episodes: Episode[];
    isLoading: boolean;
    isLoadingEpisodes: boolean;
    isPlaying: boolean;
    selectedSeason: Season | null;
    hasWatchProgress: boolean;

    // Actions
    handleSeasonSelect: (season: Season) => void;
    handlePlay: (episode?: Episode) => Promise<void>;
}

export function useContentDetail({ contentId }: UseContentDetailOptions): UseContentDetailReturn {
    const router = useRouter();
    const [show, setShow] = useState<ShowDetails | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasWatchProgress, setHasWatchProgress] = useState(false);

    // Fetch show details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setIsLoading(true);
                const details = await getShowDetails(contentId);
                setShow(details);

                // If it's a series, set up first season and load its episodes
                if (details.contentType === ContentType.Series && details.seasons.length > 0) {
                    const firstSeason = details.seasons[0];
                    setSelectedSeason(firstSeason);

                    // Load episodes for first season immediately
                    setIsLoadingEpisodes(true);
                    try {
                        const { episodes: seasonEpisodes } = await getSeriesEpisodes(details.id, firstSeason.seasonId);
                        setEpisodes(seasonEpisodes);
                    } catch (error) {
                        console.error('Failed to load initial episodes:', error);
                        // Fallback to episodes from show details if they exist
                        if (details.episodes && details.episodes.length > 0) {
                            setEpisodes(details.episodes.filter(ep => ep.seasonNumber === firstSeason.seasonNumber));
                        }
                    } finally {
                        setIsLoadingEpisodes(false);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch show details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [contentId]);

    // Check for existing watch progress
    useEffect(() => {
        if (!show) return;

        const socket = getSocket();
        if (!socket?.connected) return;

        // Check if there's watch progress for this content
        socket.emit('watch:get_progress', { contentId: show.id }, (response: any) => {
            if (response?.success && response.progress) {
                setHasWatchProgress(response.progress.progressSeconds > 0);
            }
        });
    }, [show]);

    // Load episodes when season changes
    const loadSeasonEpisodes = useCallback(async (season: Season) => {
        if (!show) return;

        setIsLoadingEpisodes(true);
        try {
            const { episodes: seasonEpisodes } = await getSeriesEpisodes(show.id, season.seasonId);
            setEpisodes(seasonEpisodes);
        } catch (error) {
            console.error('Failed to load episodes:', error);
            // Fallback to existing episodes filtered by season
            if (show.episodes) {
                setEpisodes(show.episodes.filter(ep => ep.seasonNumber === season.seasonNumber));
            }
        } finally {
            setIsLoadingEpisodes(false);
        }
    }, [show]);

    const handleSeasonSelect = useCallback((season: Season) => {
        setSelectedSeason(season);
        loadSeasonEpisodes(season);
    }, [loadSeasonEpisodes]);

    const handlePlay = useCallback(async (episode?: Episode) => {
        if (!show) return;

        setIsPlaying(true);
        try {
            if (show.contentType === ContentType.Movie) {
                const response = await playVideo({
                    type: 'movie',
                    title: show.title,
                });

                if (response.success && response.movieId && response.masterPlaylistUrl) {
                    const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
                    const captionUrl = response.captionSrt ? encodeURIComponent(response.captionSrt) : '';
                    const description = show.description ? encodeURIComponent(show.description) : '';
                    const year = show.year ? encodeURIComponent(show.year) : '';
                    const posterUrl = show.posterUrl ? encodeURIComponent(show.posterUrl) : '';

                    let url = `/watch/${response.movieId}?type=movie&title=${encodeURIComponent(show.title)}&stream=${streamUrl}`;
                    if (captionUrl) url += `&caption=${captionUrl}`;
                    if (response.spriteVtt) url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
                    if (description) url += `&description=${description}`;
                    if (year) url += `&year=${year}`;
                    if (posterUrl) url += `&poster=${posterUrl}`;

                    router.push(url);
                } else {
                    console.error('Movie playback failed - no movieId or stream URL returned');
                }
            } else if (episode) {
                const response = await playVideo({
                    type: 'series',
                    title: show.title,
                    season: episode.seasonNumber || 1,
                    episode: episode.episodeNumber,
                });

                if (response.success && response.movieId && response.masterPlaylistUrl) {
                    const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
                    const captionUrl = response.captionSrt ? encodeURIComponent(response.captionSrt) : '';
                    const description = show.description ? encodeURIComponent(show.description) : '';
                    const year = show.year ? encodeURIComponent(show.year) : '';
                    const posterUrl = show.posterUrl ? encodeURIComponent(show.posterUrl) : '';

                    let url = `/watch/${response.movieId}?type=series&title=${encodeURIComponent(show.title)}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}&stream=${streamUrl}`;
                    if (captionUrl) url += `&caption=${captionUrl}`;
                    if (response.spriteVtt) url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
                    if (description) url += `&description=${description}`;
                    if (year) url += `&year=${year}`;
                    if (posterUrl) url += `&poster=${posterUrl}`;

                    router.push(url);
                } else {
                    console.error('Series playback failed - no movieId or stream URL returned');
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Failed to start playback:', errorMessage);
        } finally {
            setIsPlaying(false);
        }
    }, [show, router]);

    return {
        show,
        episodes,
        isLoading,
        isLoadingEpisodes,
        isPlaying,
        selectedSeason,
        hasWatchProgress,
        handleSeasonSelect,
        handlePlay,
    };
}
