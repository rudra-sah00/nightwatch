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

export async function getSong(id: string): Promise<MusicTrack> {
  return apiFetch<MusicTrack>(`/api/music/song/${id}`);
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

export interface MusicHomeData {
  charts: { id: string; title: string; image: string }[];
  featured: { id: string; title: string; image: string }[];
  artists: { id: string; name: string; image: string }[];
  releases: {
    id: string;
    title: string;
    artist: string;
    image: string;
    type: string;
    albumId: string;
  }[];
  trending: {
    id: string;
    title: string;
    type: string;
    image: string;
    subtitle: string;
  }[];
  radio: { id: string; title: string; image: string; language: string }[];
}

export async function getMusicHome(): Promise<MusicHomeData> {
  return apiFetch('/api/music/home');
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
  title?: string,
  artist?: string,
  duration?: number,
): Promise<{ lyrics: string; synced: boolean; copyright: string }> {
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (artist) params.set('artist', artist);
  if (duration) params.set('duration', String(Math.round(duration)));
  const qs = params.toString();
  return apiFetch(`/api/music/lyrics/${songId}${qs ? `?${qs}` : ''}`);
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

export async function getRadioSongs(
  stationName: string,
  language = 'hindi',
): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/radio/${encodeURIComponent(stationName)}/songs?language=${encodeURIComponent(language)}`,
  );
  return data.songs;
}

export async function getUserQueue(): Promise<MusicTrack[]> {
  return apiFetch('/api/music/queue');
}

export async function getMusicLanguages(): Promise<string> {
  const data = await apiFetch<{ languages: string }>('/api/music/languages');
  return data.languages;
}

export async function setMusicLanguages(languages: string): Promise<void> {
  await apiFetch('/api/music/languages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ languages }),
  });
}

export async function getTrending(
  type: 'song' | 'album' | 'playlist' = 'song',
  language = 'hindi',
) {
  return apiFetch<
    {
      id: string;
      title: string;
      type: string;
      image: string;
      subtitle: string;
    }[]
  >(
    `/api/music/trending?type=${type}&language=${encodeURIComponent(language)}`,
  );
}

export async function getTopSearches() {
  return apiFetch<{ id: string; title: string; type: string; image: string }[]>(
    '/api/music/top-searches',
  );
}

export async function searchSongs(query: string, page = 1, limit = 20) {
  return apiFetch<{ total: number; start: number; results: MusicTrack[] }>(
    `/api/music/search/songs?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

export async function searchAlbums(query: string, page = 1, limit = 20) {
  return apiFetch<{
    total: number;
    start: number;
    results: {
      id: string;
      title: string;
      artist: string;
      image: string;
      year: number;
    }[];
  }>(
    `/api/music/search/albums?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

export async function searchArtists(query: string, page = 1, limit = 20) {
  return apiFetch<{
    total: number;
    start: number;
    results: { id: string; name: string; image: string; role: string }[];
  }>(
    `/api/music/search/artists?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

export async function searchPlaylists(query: string, page = 1, limit = 20) {
  return apiFetch<{
    total: number;
    start: number;
    results: { id: string; title: string; image: string; songCount: number }[];
  }>(
    `/api/music/search/playlists?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

export async function getArtistStation(name: string): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/artist-station?name=${encodeURIComponent(name)}`,
  );
  return data.songs;
}

export async function getBrowseModules() {
  return apiFetch<{
    genres: { id: string; title: string; image: string; type: string }[];
  }>('/api/music/browse');
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
  songId: string,
  title: string,
  artist: string,
  duration: number,
): Promise<SyncedLyricLine[] | null> {
  try {
    const data = await getLyrics(songId, title, artist, duration);
    if (!data.synced || !data.lyrics) return null;
    // Parse LRC format: [mm:ss.xx] text
    return data.lyrics
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

export async function getSongRecommendations(
  songId: string,
  limit = 10,
): Promise<MusicTrack[]> {
  return apiFetch(`/api/music/song/${songId}/recommendations?limit=${limit}`);
}

export async function createSongRadio(songId: string): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/song/${songId}/radio`,
  );
  return data.songs;
}

export async function getMixDetails(id: string): Promise<{
  id: string;
  title: string;
  image: string;
  songs: MusicTrack[];
}> {
  return apiFetch(`/api/music/mix/${id}`);
}

export async function searchMore(
  query: string,
  page = 1,
  limit = 20,
): Promise<{ total: number; start: number; results: MusicTrack[] }> {
  return apiFetch(
    `/api/music/search/more?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

export async function getAlbumRecommendations(albumId: string) {
  return apiFetch<
    { id: string; title: string; artist: string; image: string; year: number }[]
  >(`/api/music/album/${albumId}/recommendations`);
}
