export interface WatchActivity {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4; // 0=empty, 4=high
}

export interface ProfileStats {
    totalWatchTime: number; // seconds
    daysActive: number;
    longestStreak: number;
}
