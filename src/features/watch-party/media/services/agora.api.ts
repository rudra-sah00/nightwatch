import { apiFetch } from '@/lib/fetch';

interface AgoraTokenResponse {
  token: string;
  appId: string;
  channel: string;
  uid: number;
}

interface AgoraRtmTokenResponse {
  token: string;
  appId: string;
  /** Raw string user ID — RTM does not use a numeric hash */
  uid: string;
}

/**
 * Retrieve an Agora token for a specific channel/room.
 */
export async function getAgoraToken(params: {
  channelName: string;
  guestId: string;
  guestName: string;
}): Promise<AgoraTokenResponse> {
  const { channelName, guestId, guestName } = params;
  const url = `/api/agora/token?channelName=${channelName}&guestId=${guestId}&guestName=${encodeURIComponent(guestName)}`;

  return apiFetch<AgoraTokenResponse>(url);
}

/**
 * Retrieve an Agora RTM signaling token for a specific room.
 * RTM tokens are scoped to the user (not the channel) and allow
 * joining the Agora RTM signaling channel for watch party events.
 */
export async function getAgoraRtmToken(params: {
  channelName: string;
  guestId?: string;
  guestName?: string;
}): Promise<AgoraRtmTokenResponse> {
  const { channelName, guestId, guestName } = params;
  let url = `/api/agora/rtm-token?channelName=${channelName}`;

  if (guestId) url += `&guestId=${guestId}`;
  if (guestName) url += `&guestName=${encodeURIComponent(guestName)}`;

  return apiFetch<AgoraRtmTokenResponse>(url);
}
