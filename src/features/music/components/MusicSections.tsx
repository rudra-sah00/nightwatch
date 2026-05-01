'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  getMixDetails,
  getRadioSongs,
  getSong,
  type MusicTrack,
} from '@/features/music/api';
import { Card, ScrollRow, Section } from './MusicPrimitives';
import { UserPlaylists } from './UserPlaylists';

/** A chart or featured playlist entry (id, title, cover image). */
type ChartItem = { id: string; title: string; image: string };
/** An artist entry (id, display name, profile image). */
type ArtistItem = { id: string; name: string; image: string };
/** A new-release entry — may be a single song or an album. */
type ReleaseItem = {
  id: string;
  title: string;
  artist: string;
  image: string;
  /** `'song'` or `'album'` — determines navigation target. */
  type: string;
  /** Album ID for deep-linking; empty string for standalone singles. */
  albumId: string;
};
/** A radio station entry with its primary language tag. */
type RadioItem = { id: string; title: string; image: string; language: string };
/** A trending item that can be a song, album, playlist, or mix. */
type TrendingItem = {
  id: string;
  title: string;
  /** Discriminator: `'song'` | `'album'` | `'playlist'` | `'mix'`. */
  type: string;
  image: string;
  subtitle: string;
};
/** A genre/mood tile from the browse modules API. */
type GenreItem = { id: string; title: string; image: string; type: string };

/**
 * Aggregate data shape for all content sections on the music home page.
 *
 * Populated by {@link MusicView} from parallel API calls to `getMusicHome`,
 * `getTrending`, and `getBrowseModules`.
 */
export interface MusicSectionsData {
  charts: ChartItem[];
  featured: ChartItem[];
  artists: ArtistItem[];
  releases: ReleaseItem[];
  radio: RadioItem[];
  trendingSongs: TrendingItem[];
  genres: GenreItem[];
}

/**
 * Props for the {@link MusicSections} component.
 */
interface MusicSectionsProps {
  /** Aggregated home-page data from the music APIs. */
  data: MusicSectionsData;
  /** Key used to force-remount {@link UserPlaylists} after a new playlist is created. */
  playlistKey: number;
  /** Callback to start playback of a track, optionally with a new queue. */
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void;
}

/**
 * Renders all content sections on the `/music` home page.
 *
 * Sections are rendered conditionally — only when their data arrays are non-empty:
 * 1. **User Playlists** — personal playlists via {@link UserPlaylists}.
 * 2. **Top Charts** — editorial chart playlists.
 * 3. **Playlists** — featured / curated playlists.
 * 4. **Top Artists** — circular artist avatars.
 * 5. **New Releases** — albums and singles; songs play inline, albums navigate.
 * 6. **Trending** — mixed content (songs, albums, playlists, mixes) with type-aware actions.
 * 7. **Browse Genres** — genre/mood tiles (first 20); playlists navigate, others start radio.
 * 8. **Radio Stations** — on-demand radio with toast feedback; includes a "View All" link.
 *
 * Each section uses the {@link Section} / {@link ScrollRow} / {@link Card} layout primitives.
 */
export function MusicSections({
  data,
  playlistKey,
  onPlay,
}: MusicSectionsProps) {
  const t = useTranslations('music');
  const { charts, featured, artists, releases, radio, trendingSongs, genres } =
    data;

  return (
    <>
      {/* User Playlists */}
      <UserPlaylists key={playlistKey} />

      {charts.length > 0 && (
        <Section title={t('topCharts')}>
          <ScrollRow>
            {charts.map((c) => (
              <Card
                key={c.id}
                image={c.image}
                title={c.title}
                href={`/music/playlist/${c.id}`}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {featured.length > 0 && (
        <Section title={t('playlists')}>
          <ScrollRow>
            {featured.map((p) => (
              <Card
                key={p.id}
                image={p.image}
                title={p.title}
                href={`/music/playlist/${p.id}`}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {artists.length > 0 && (
        <Section title={t('topArtists')}>
          <ScrollRow>
            {artists.map((a) => (
              <Link
                key={a.id}
                href={`/music/artist/${a.id}`}
                className="flex-shrink-0 w-28 md:w-32 text-center"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[3px] border-border overflow-hidden mx-auto hover:border-neo-yellow transition-colors">
                  <img
                    src={a.image}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-wider mt-2 truncate">
                  {a.name}
                </p>
              </Link>
            ))}
          </ScrollRow>
        </Section>
      )}

      {releases.length > 0 && (
        <Section title={t('newReleases')}>
          <ScrollRow>
            {releases.map((r) => (
              <Card
                key={r.id}
                image={r.image}
                title={r.title}
                subtitle={r.artist}
                href={r.albumId ? `/music/album/${r.albumId}` : undefined}
                onClick={
                  r.type === 'song' && !r.albumId
                    ? () => {
                        getSong(r.id)
                          .then((song) => {
                            if (song) onPlay(song, [song]);
                          })
                          .catch(() => {});
                      }
                    : undefined
                }
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {trendingSongs.length > 0 && (
        <Section title={t('trending')}>
          <ScrollRow>
            {trendingSongs.map((item) => (
              <Card
                key={item.id}
                image={item.image}
                title={item.title}
                subtitle={item.subtitle}
                href={
                  item.type === 'album'
                    ? `/music/album/${item.id}`
                    : item.type === 'playlist'
                      ? `/music/playlist/${item.id}`
                      : undefined
                }
                onClick={
                  item.type === 'song'
                    ? () => {
                        getSong(item.id)
                          .then((song) => {
                            if (song) onPlay(song, [song]);
                          })
                          .catch(() => {});
                      }
                    : item.type === 'mix'
                      ? () => {
                          getMixDetails(item.id)
                            .then((mix) => {
                              if (mix.songs.length > 0)
                                onPlay(mix.songs[0], mix.songs);
                            })
                            .catch(() => {});
                        }
                      : undefined
                }
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {genres.length > 0 && (
        <Section title={t('browseGenres')}>
          <ScrollRow>
            {genres.slice(0, 20).map((g) => (
              <Card
                key={g.id}
                image={g.image}
                title={g.title}
                href={
                  g.type === 'playlist' ? `/music/playlist/${g.id}` : undefined
                }
                onClick={
                  g.type !== 'playlist'
                    ? () => {
                        getRadioSongs(g.title)
                          .then((songs) => {
                            if (songs.length > 0) onPlay(songs[0], songs);
                          })
                          .catch(() => {});
                      }
                    : undefined
                }
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {radio.length > 0 && (
        <Section title={t('radioStations')}>
          <ScrollRow>
            {radio.slice(0, 10).map((r) => (
              <Card
                key={r.id}
                image={r.image}
                title={r.title}
                onClick={() => {
                  toast.promise(
                    getRadioSongs(r.title, r.language || 'hindi').then(
                      (songs) => {
                        if (songs.length > 0) {
                          onPlay(songs[0], songs);
                        } else {
                          throw new Error('No songs available');
                        }
                      },
                    ),
                    {
                      loading: r.title,
                      success: r.title,
                      error: 'Failed to load station',
                    },
                  );
                }}
              />
            ))}
            <Link
              href="/music/radio/hindi"
              className="flex-shrink-0 w-36 md:w-40 flex items-center justify-center"
            >
              <span className="text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-xs tracking-widest transition-colors">
                {t('viewAll')}
              </span>
            </Link>
          </ScrollRow>
        </Section>
      )}
    </>
  );
}
