import type { FriendActivity } from './types';

export function formatActivity(activity: FriendActivity): string {
  if (activity.type === 'live') {
    return `Watching Live: ${activity.title}`;
  }
  if (activity.type === 'series' && activity.season && activity.episode) {
    return `Watching ${activity.title} S${activity.season}E${activity.episode}`;
  }
  return `Watching ${activity.title}`;
}
