/**
 * Represents a single day's watch-activity entry used to render the
 * activity heatmap on the profile page.
 */
export interface WatchActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0=empty, 4=high
}
