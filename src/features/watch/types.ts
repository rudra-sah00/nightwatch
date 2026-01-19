// Watch feature types
export interface WatchProgress {
    id: string;
    contentId: string;
    contentType: 'Movie' | 'Series';
    title: string;
    posterUrl: string;
    progressSeconds: number;
    durationSeconds: number;
    progressPercent: number;
    remainingSeconds: number;
    remainingMinutes: number;
    lastWatchedAt: string;
    // Series specific
    episodeId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
}

export interface WatchActivity {
    date: string;
    watchSeconds: number;
    level: 0 | 1 | 2 | 3 | 4;
}
