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

/** Album summary as returned within an artist's profile. */
export interface MusicArtistAlbum {
  id: string;
  title: string;
  artist: string;
  image: string;
  year: number;
  songCount: number;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  duration: number;
  releaseDate: string;
  seasonNo: number;
  episodeNumber: number;
  encryptedMediaUrl: string;
}

export interface PodcastShow {
  id: string;
  title: string;
  image: string;
  description: string;
  seasons: { id: string; title: string }[];
  episodes: PodcastEpisode[];
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

/** A single line of time-synced (LRC) lyrics. */
export interface SyncedLyricLine {
  /** Timestamp in seconds when this line should be displayed. */
  time: number;
  /** Lyric text for this line. */
  text: string;
}
