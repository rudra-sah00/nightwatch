export interface DiscoverSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  language: string;
  year: number;
  seed?: string;
}
