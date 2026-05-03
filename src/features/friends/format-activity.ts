import type { FriendActivity } from './types';

/**
 * Formats a {@link FriendActivity} into a human-readable string.
 *
 * @param activity - The friend's current activity.
 * @returns A display string such as `"Watching Live: IPL"`, `"Listening to Shape of You"`, etc.
 */
export function formatActivity(activity: FriendActivity): string {
  if (activity.type === 'music') {
    return activity.artist
      ? `Listening to ${activity.title} — ${activity.artist}`
      : `Listening to ${activity.title}`;
  }
  if (activity.type === 'reading') {
    return `Reading ${activity.title}`;
  }
  if (activity.type === 'live') {
    return `Watching Live: ${activity.title}`;
  }
  if (activity.type === 'series' && activity.season && activity.episode) {
    return `Watching ${activity.title} S${activity.season}E${activity.episode}`;
  }
  return `Watching ${activity.title}`;
}
