import { apiFetch } from '@/lib/fetch';

interface AgoraTokenResponse {
  token: string;
  appId: string;
  channel: string;
  uid: number;
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
