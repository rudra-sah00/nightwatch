import { apiFetch } from '@/lib/fetch';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number;
  image: string;
  language: string;
  year: number;
  hasLyrics: boolean;
}

export interface MusicSearchResult {
  songs: MusicTrack[];
  albums: {
    id: string;
    title: string;
    artist: string;
    image: string;
    year: number;
  }[];
  playlists: { id: string; title: string; image: string; songCount: number }[];
}

export interface MusicAlbum {
  id: string;
  title: string;
  artist: string;
  image: string;
  year: number;
  songCount: number;
  language: string;
  songs: MusicTrack[];
}

export async function searchMusic(query: string): Promise<MusicSearchResult> {
  return apiFetch<MusicSearchResult>(
    `/api/music/search?q=${encodeURIComponent(query)}`,
  );
}

export async function getMusicAlbum(id: string): Promise<MusicAlbum> {
  return apiFetch<MusicAlbum>(`/api/music/album/${id}`);
}

export async function getMusicPlaylist(id: string): Promise<{
  id: string;
  title: string;
  image: string;
  songCount: number;
  songs: MusicTrack[];
}> {
  return apiFetch(`/api/music/playlist/${id}`);
}

export async function getStreamUrl(
  songId: string,
  bitrate = 320,
): Promise<string> {
  const data = await apiFetch<{ url: string }>(
    `/api/music/stream/${songId}?bitrate=${bitrate}`,
  );
  return data.url;
}

export async function getCharts() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/charts',
  );
}

export async function getFeaturedPlaylists() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/featured',
  );
}

export async function getTopArtists() {
  return apiFetch<{ id: string; name: string; image: string }[]>(
    '/api/music/artists',
  );
}

export async function getNewReleases() {
  return apiFetch<
    { id: string; title: string; artist: string; image: string }[]
  >('/api/music/new-releases');
}

export async function getLyrics(
  songId: string,
): Promise<{ lyrics: string; synced: boolean; copyright: string }> {
  return apiFetch(`/api/music/lyrics/${songId}`);
}

export interface MusicArtistAlbum {
  id: string;
  title: string;
  artist: string;
  image: string;
  year: number;
  songCount: number;
}

export async function getMusicArtist(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    image: string;
    bio: string | null;
    topAlbums: MusicArtistAlbum[];
    songs: MusicTrack[];
  }>(`/api/music/artist/${id}`);
}

export async function getArtistAlbums(artistId: string, page = 1) {
  return apiFetch<MusicArtistAlbum[]>(
    `/api/music/artist/${artistId}/albums?page=${page}`,
  );
}

export async function getTopPodcasts() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/podcasts',
  );
}

export async function getRadioStations(language?: string) {
  const qs = language ? `?language=${encodeURIComponent(language)}` : '';
  return apiFetch<
    { id: string; title: string; image: string; language: string }[]
  >(`/api/music/radio${qs}`);
}

export async function getUserQueue(): Promise<MusicTrack[]> {
  return apiFetch('/api/music/queue');
}

export async function addToUserQueue(track: {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
}): Promise<MusicTrack[]> {
  return apiFetch('/api/music/queue', {
    method: 'POST',
    body: JSON.stringify(track),
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface UserPlaylist {
  id: string;
  name: string;
  coverUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  createdAt: string;
}

export interface UserPlaylistDetail extends UserPlaylist {
  tracks: {
    id: string;
    trackId: string;
    title: string;
    artist: string;
    album: string;
    image: string;
    duration: number;
    position: number;
  }[];
}

export async function getUserPlaylists(): Promise<UserPlaylist[]> {
  return apiFetch('/api/music/playlists');
}

export async function createUserPlaylist(name: string): Promise<UserPlaylist> {
  return apiFetch('/api/music/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getUserPlaylistDetail(
  id: string,
): Promise<UserPlaylistDetail> {
  return apiFetch(`/api/music/playlists/${id}`);
}

export async function updateUserPlaylist(
  id: string,
  data: { name?: string; isPublic?: boolean },
): Promise<UserPlaylist> {
  return apiFetch(`/api/music/playlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteUserPlaylist(id: string): Promise<void> {
  await apiFetch(`/api/music/playlists/${id}`, { method: 'DELETE' });
}

export async function uploadPlaylistCover(
  id: string,
  file: File,
): Promise<UserPlaylist> {
  return apiFetch(`/api/music/playlists/${id}/cover`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: {
    trackId: string;
    title: string;
    artist: string;
    album: string;
    image: string;
    duration: number;
  },
): Promise<unknown> {
  return apiFetch(`/api/music/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify(track),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackEntryId: string,
): Promise<void> {
  await apiFetch(`/api/music/playlists/${playlistId}/tracks/${trackEntryId}`, {
    method: 'DELETE',
  });
}

export interface SyncedLyricLine {
  time: number;
  text: string;
}

export async function getSyncedLyrics(
  title: string,
  artist: string,
  duration: number,
): Promise<SyncedLyricLine[] | null> {
  try {
    const q = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://lrclib.net/api/search?q=${q}`, {
      headers: { 'User-Agent': 'Nightwatch/2.0' },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as {
      syncedLyrics: string | null;
      duration: number;
    }[];
    // Find best match by duration
    const match =
      results.find(
        (r) => r.syncedLyrics && Math.abs(r.duration - duration) < 5,
      ) ?? results.find((r) => r.syncedLyrics);
    if (!match?.syncedLyrics) return null;
    // Parse LRC format: [mm:ss.xx] text
    return match.syncedLyrics
      .split('\n')
      .map((line) => {
        const m = line.match(/\[(\d+):(\d+\.\d+)\]\s*(.*)/);
        if (!m) return null;
        return {
          time: Number(m[1]) * 60 + Number(m[2]),
          text: m[3],
        };
      })
      .filter((l): l is SyncedLyricLine => l !== null && l.text.length > 0);
  } catch {
    return null;
  }
}
