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
