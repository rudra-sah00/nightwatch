import type { FriendActivity } from './types';

/**
 * Formats a {@link FriendActivity} into a human-readable string.
 *
 * @param activity - The friend's current watching activity.
 * @returns A display string such as `"Watching Live: IPL"` or `"Watching Breaking Bad S5E16"`.
 */
export function formatActivity(activity: FriendActivity): string {
  if (activity.type === 'live') {
    return `Watching Live: ${activity.title}`;
  }
  if (activity.type === 'series' && activity.season && activity.episode) {
    return `Watching ${activity.title} S${activity.season}E${activity.episode}`;
  }
  return `Watching ${activity.title}`;
}
