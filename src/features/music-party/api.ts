import { apiFetch } from '@/lib/fetch';

export interface MusicPartyMember {
  id: string;
  name: string;
  profilePhoto?: string | null;
  isHost: boolean;
  joinedAt: number;
}

export interface MusicPartyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  addedBy: string;
}

export interface MusicPartyRoom {
  id: string;
  name: string;
  hostId: string;
  members: MusicPartyMember[];
  queue: MusicPartyTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
  createdAt: number;
}

interface JoinResponse {
  room: MusicPartyRoom;
  rtm: { token: string; channelName: string };
  userId: string;
}

interface CreateResponse {
  room: MusicPartyRoom;
  rtm: { token: string; channelName: string };
}

export async function createMusicParty(name: string): Promise<CreateResponse> {
  return apiFetch('/api/music-party/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getMusicPartyRoom(id: string): Promise<MusicPartyRoom> {
  return apiFetch(`/api/music-party/${id}`);
}

export async function joinMusicParty(
  id: string,
  displayName: string,
): Promise<JoinResponse> {
  return apiFetch(`/api/music-party/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ displayName }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function leaveMusicParty(id: string): Promise<void> {
  await apiFetch(`/api/music-party/${id}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function addToMusicPartyQueue(
  id: string,
  track: Omit<MusicPartyTrack, 'addedBy'>,
): Promise<MusicPartyRoom> {
  return apiFetch(`/api/music-party/${id}/queue`, {
    method: 'POST',
    body: JSON.stringify(track),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function syncMusicPartyState(
  id: string,
  state: { trackId?: string; isPlaying?: boolean; progress?: number },
): Promise<MusicPartyRoom> {
  return apiFetch(`/api/music-party/${id}/state`, {
    method: 'POST',
    body: JSON.stringify(state),
    headers: { 'Content-Type': 'application/json' },
  });
}
