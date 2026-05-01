import { apiFetch } from '@/lib/fetch';

/** A single music track (song) with metadata from JioSaavn. */
export interface MusicTrack {
  /** Unique JioSaavn song identifier. */
  id: string;
  /** Song title. */
  title: string;
  /** Primary artist name(s). */
  artist: string;
  /** Album name the track belongs to. */
  album: string;
  /** Unique identifier of the parent album. */
  albumId: string;
  /** Track duration in seconds. */
  duration: number;
  /** URL to the album/track artwork image. */
  image: string;
  /** Primary language of the track (e.g. `"hindi"`, `"english"`). */
  language: string;
  /** Release year. */
  year: number;
  /** Whether synced or plain lyrics are available for this track. */
  hasLyrics: boolean;
}

/** Combined search results across songs, albums, and playlists. */
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

/** Full album details including its track listing. */
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

/**
 * Search for songs, albums, and playlists matching a query string.
 *
 * @param query - Free-text search query.
 * @returns Combined results across songs, albums, and playlists.
 */
export async function searchMusic(query: string): Promise<MusicSearchResult> {
  return apiFetch<MusicSearchResult>(
    `/api/music/search?q=${encodeURIComponent(query)}`,
  );
}

/**
 * Fetch full album details including all tracks.
 *
 * @param id - JioSaavn album ID.
 * @returns Album metadata and track listing.
 */
export async function getMusicAlbum(id: string): Promise<MusicAlbum> {
  return apiFetch<MusicAlbum>(`/api/music/album/${id}`);
}

/**
 * Fetch a single song's metadata by ID.
 *
 * @param id - JioSaavn song ID.
 * @returns The track's metadata.
 */
export async function getSong(id: string): Promise<MusicTrack> {
  return apiFetch<MusicTrack>(`/api/music/song/${id}`);
}

/**
 * Fetch a JioSaavn playlist with its tracks.
 *
 * @param id - Playlist ID.
 * @returns Playlist metadata and songs.
 */
export async function getMusicPlaylist(id: string): Promise<{
  id: string;
  title: string;
  image: string;
  songCount: number;
  songs: MusicTrack[];
}> {
  return apiFetch(`/api/music/playlist/${id}`);
}

/**
 * Get a direct streaming URL for a song.
 *
 * @param songId - JioSaavn song ID.
 * @param bitrate - Desired audio bitrate in kbps (default `320`).
 * @returns The direct audio stream URL.
 */
export async function getStreamUrl(
  songId: string,
  bitrate = 320,
): Promise<string> {
  const data = await apiFetch<{ url: string }>(
    `/api/music/stream/${songId}?bitrate=${bitrate}`,
  );
  return data.url;
}

/** Aggregated data for the music home/discover page. */
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

/**
 * Fetch the music home page data (charts, featured, artists, releases, trending, radio).
 *
 * @returns Aggregated home page sections.
 */
export async function getMusicHome(): Promise<MusicHomeData> {
  return apiFetch('/api/music/home');
}

/**
 * Fetch curated chart playlists.
 *
 * @returns Array of chart entries.
 */
export async function getCharts() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/charts',
  );
}

/**
 * Fetch editorially featured playlists.
 *
 * @returns Array of featured playlist entries.
 */
export async function getFeaturedPlaylists() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/featured',
  );
}

/**
 * Fetch popular/top artists.
 *
 * @returns Array of artist entries.
 */
export async function getTopArtists() {
  return apiFetch<{ id: string; name: string; image: string }[]>(
    '/api/music/artists',
  );
}

/**
 * Fetch new album and single releases.
 *
 * @returns Array of new release entries.
 */
export async function getNewReleases() {
  return apiFetch<
    { id: string; title: string; artist: string; image: string }[]
  >('/api/music/new-releases');
}

/**
 * Fetch lyrics for a song. May return plain or LRC-synced lyrics.
 *
 * @param songId - JioSaavn song ID.
 * @param title - Song title (fallback search hint).
 * @param artist - Artist name (fallback search hint).
 * @param duration - Track duration in seconds (helps match synced lyrics).
 * @returns Object with `lyrics` text, `synced` flag, and `copyright` notice.
 */
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

/** Album summary as returned within an artist's profile. */
export interface MusicArtistAlbum {
  id: string;
  title: string;
  artist: string;
  image: string;
  year: number;
  songCount: number;
}

/**
 * Fetch an artist's profile including bio, top albums, and songs.
 *
 * @param id - JioSaavn artist ID.
 * @returns Artist profile with bio, top albums, and popular songs.
 */
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

/**
 * Fetch paginated albums for an artist.
 *
 * @param artistId - JioSaavn artist ID.
 * @param page - Page number (1-indexed, default `1`).
 * @returns Array of album summaries.
 */
export async function getArtistAlbums(artistId: string, page = 1) {
  return apiFetch<MusicArtistAlbum[]>(
    `/api/music/artist/${artistId}/albums?page=${page}`,
  );
}

/**
 * Fetch top/popular podcasts.
 *
 * @returns Array of podcast entries.
 */
export async function getTopPodcasts() {
  return apiFetch<{ id: string; title: string; image: string }[]>(
    '/api/music/podcasts',
  );
}

/**
 * Fetch available radio stations, optionally filtered by language.
 *
 * @param language - Language filter (e.g. `"hindi"`). Omit for all.
 * @returns Array of radio station entries.
 */
export async function getRadioStations(language?: string) {
  const qs = language ? `?language=${encodeURIComponent(language)}` : '';
  return apiFetch<
    { id: string; title: string; image: string; language: string }[]
  >(`/api/music/radio${qs}`);
}

/**
 * Fetch songs for a radio station.
 *
 * @param stationName - Name of the radio station.
 * @param language - Language context (default `"hindi"`).
 * @returns Array of tracks for the station.
 */
export async function getRadioSongs(
  stationName: string,
  language = 'hindi',
): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/radio/${encodeURIComponent(stationName)}/songs?language=${encodeURIComponent(language)}`,
  );
  return data.songs;
}

/**
 * Fetch the current user's persisted music queue from Redis.
 *
 * @returns Array of tracks in the queue.
 */
export async function getUserQueue(): Promise<MusicTrack[]> {
  return apiFetch('/api/music/queue');
}

/**
 * Get the user's preferred music languages.
 *
 * @returns Comma-separated language string, e.g. `"hindi,english"`.
 */
export async function getMusicLanguages(): Promise<string> {
  const data = await apiFetch<{ languages: string }>('/api/music/languages');
  return data.languages;
}

/**
 * Update the user's preferred music languages.
 *
 * @param languages - Comma-separated language string, e.g. `"hindi,english,punjabi"`.
 */
export async function setMusicLanguages(languages: string): Promise<void> {
  await apiFetch('/api/music/languages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ languages }),
  });
}

/**
 * Fetch trending items (songs, albums, or playlists).
 *
 * @param type - Content type to fetch (default `"song"`).
 * @param language - Language filter (default `"hindi"`).
 * @returns Array of trending items.
 */
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

/**
 * Fetch top/popular search suggestions.
 *
 * @returns Array of top search entries.
 */
export async function getTopSearches() {
  return apiFetch<{ id: string; title: string; type: string; image: string }[]>(
    '/api/music/top-searches',
  );
}

/**
 * Paginated search for songs only.
 *
 * @param query - Search query.
 * @param page - Page number (1-indexed, default `1`).
 * @param limit - Results per page (default `20`).
 * @returns Paginated result with `total`, `start`, and `results`.
 */
export async function searchSongs(query: string, page = 1, limit = 20) {
  return apiFetch<{ total: number; start: number; results: MusicTrack[] }>(
    `/api/music/search/songs?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

/**
 * Paginated search for albums only.
 *
 * @param query - Search query.
 * @param page - Page number (1-indexed, default `1`).
 * @param limit - Results per page (default `20`).
 * @returns Paginated result with `total`, `start`, and `results`.
 */
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

/**
 * Paginated search for artists only.
 *
 * @param query - Search query.
 * @param page - Page number (1-indexed, default `1`).
 * @param limit - Results per page (default `20`).
 * @returns Paginated result with `total`, `start`, and `results`.
 */
export async function searchArtists(query: string, page = 1, limit = 20) {
  return apiFetch<{
    total: number;
    start: number;
    results: { id: string; name: string; image: string; role: string }[];
  }>(
    `/api/music/search/artists?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

/**
 * Paginated search for playlists only.
 *
 * @param query - Search query.
 * @param page - Page number (1-indexed, default `1`).
 * @param limit - Results per page (default `20`).
 * @returns Paginated result with `total`, `start`, and `results`.
 */
export async function searchPlaylists(query: string, page = 1, limit = 20) {
  return apiFetch<{
    total: number;
    start: number;
    results: { id: string; title: string; image: string; songCount: number }[];
  }>(
    `/api/music/search/playlists?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

/**
 * Fetch an auto-generated artist radio station (mix of the artist's songs).
 *
 * @param name - Artist name.
 * @returns Array of tracks for the artist station.
 */
export async function getArtistStation(name: string): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/artist-station?name=${encodeURIComponent(name)}`,
  );
  return data.songs;
}

/**
 * Fetch browse/genre modules for the explore page.
 *
 * @returns Object containing genre categories.
 */
export async function getBrowseModules() {
  return apiFetch<{
    genres: { id: string; title: string; image: string; type: string }[];
  }>('/api/music/browse');
}

/**
 * Persist a track to the user's queue in the backend (Redis).
 *
 * @param track - Track metadata to add.
 * @returns The updated queue.
 */
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

/** Summary of a user-created playlist. */
export interface UserPlaylist {
  id: string;
  name: string;
  coverUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  createdAt: string;
}

/** Full user playlist including its ordered track entries. */
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

/**
 * Fetch all playlists created by the current user.
 *
 * @returns Array of user playlist summaries.
 */
export async function getUserPlaylists(): Promise<UserPlaylist[]> {
  return apiFetch('/api/music/playlists');
}

/**
 * Create a new empty user playlist.
 *
 * @param name - Display name for the playlist.
 * @returns The newly created playlist.
 */
export async function createUserPlaylist(name: string): Promise<UserPlaylist> {
  return apiFetch('/api/music/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Fetch a user playlist with its full track listing.
 *
 * @param id - Playlist ID.
 * @returns Playlist metadata and ordered tracks.
 */
export async function getUserPlaylistDetail(
  id: string,
): Promise<UserPlaylistDetail> {
  return apiFetch(`/api/music/playlists/${id}`);
}

/**
 * Update a user playlist's name or visibility.
 *
 * @param id - Playlist ID.
 * @param data - Fields to update.
 * @returns The updated playlist.
 */
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

/**
 * Delete a user playlist.
 *
 * @param id - Playlist ID to delete.
 */
export async function deleteUserPlaylist(id: string): Promise<void> {
  await apiFetch(`/api/music/playlists/${id}`, { method: 'DELETE' });
}

/**
 * Upload a custom cover image for a user playlist.
 *
 * @param id - Playlist ID.
 * @param file - Image file to upload.
 * @returns The updated playlist with new cover URL.
 */
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

/**
 * Add a track to a user playlist.
 *
 * @param playlistId - Target playlist ID.
 * @param track - Track metadata to add.
 * @returns Server response.
 */
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

/**
 * Remove a track entry from a user playlist.
 *
 * @param playlistId - Playlist ID.
 * @param trackEntryId - The unique entry ID of the track within the playlist.
 */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackEntryId: string,
): Promise<void> {
  await apiFetch(`/api/music/playlists/${playlistId}/tracks/${trackEntryId}`, {
    method: 'DELETE',
  });
}

/** A single line of time-synced (LRC) lyrics. */
export interface SyncedLyricLine {
  /** Timestamp in seconds when this line should be displayed. */
  time: number;
  /** Lyric text for this line. */
  text: string;
}

/**
 * Fetch and parse time-synced (LRC) lyrics for a song.
 *
 * @param songId - JioSaavn song ID.
 * @param title - Song title (search hint).
 * @param artist - Artist name (search hint).
 * @param duration - Track duration in seconds.
 * @returns Parsed array of {@link SyncedLyricLine} entries, or `null` if unavailable.
 */
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

/**
 * Fetch song recommendations based on a seed song.
 *
 * @param songId - JioSaavn song ID to base recommendations on.
 * @param limit - Maximum number of recommendations (default `10`).
 * @returns Array of recommended tracks.
 */
export async function getSongRecommendations(
  songId: string,
  limit = 10,
): Promise<MusicTrack[]> {
  return apiFetch(`/api/music/song/${songId}/recommendations?limit=${limit}`);
}

/**
 * Create a radio station seeded from a specific song.
 *
 * @param songId - JioSaavn song ID.
 * @returns Array of tracks for the generated radio.
 */
export async function createSongRadio(songId: string): Promise<MusicTrack[]> {
  const data = await apiFetch<{ songs: MusicTrack[] }>(
    `/api/music/song/${songId}/radio`,
  );
  return data.songs;
}

/**
 * Fetch details and songs for a curated mix.
 *
 * @param id - Mix ID.
 * @returns Mix metadata and track listing.
 */
export async function getMixDetails(id: string): Promise<{
  id: string;
  title: string;
  image: string;
  songs: MusicTrack[];
}> {
  return apiFetch(`/api/music/mix/${id}`);
}

/**
 * Extended paginated search returning additional song results.
 *
 * @param query - Search query.
 * @param page - Page number (1-indexed, default `1`).
 * @param limit - Results per page (default `20`).
 * @returns Paginated result with `total`, `start`, and `results`.
 */
export async function searchMore(
  query: string,
  page = 1,
  limit = 20,
): Promise<{ total: number; start: number; results: MusicTrack[] }> {
  return apiFetch(
    `/api/music/search/more?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}

/**
 * Fetch album recommendations based on a seed album.
 *
 * @param albumId - JioSaavn album ID.
 * @returns Array of recommended album summaries.
 */
export async function getAlbumRecommendations(albumId: string) {
  return apiFetch<
    { id: string; title: string; artist: string; image: string; year: number }[]
  >(`/api/music/album/${albumId}/recommendations`);
}
