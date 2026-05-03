import { describe, expect, it } from 'vitest';
import { formatActivity } from '@/features/friends/format-activity';

describe('formatActivity', () => {
  it('formats a movie activity', () => {
    expect(
      formatActivity({
        type: 'movie',
        title: 'Inception',
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Watching Inception');
  });

  it('formats a series activity with season and episode', () => {
    expect(
      formatActivity({
        type: 'series',
        title: 'Breaking Bad',
        artist: null,
        season: 2,
        episode: 3,
        episodeTitle: 'Bit by a Dead Bee',
        posterUrl: 'https://example.com/poster.jpg',
        secondaryPosterUrl: null,
      }),
    ).toBe('Watching Breaking Bad S2E3');
  });

  it('formats a series without season/episode as movie-style', () => {
    expect(
      formatActivity({
        type: 'series',
        title: 'Stranger Things',
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Watching Stranger Things');
  });

  it('formats a livestream activity', () => {
    expect(
      formatActivity({
        type: 'livestream',
        title: 'Live Event',
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Watching Live Event');
  });

  it('formats a music activity with artist', () => {
    expect(
      formatActivity({
        type: 'music',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Listening to Shape of You — Ed Sheeran');
  });

  it('formats a music activity without artist', () => {
    expect(
      formatActivity({
        type: 'music',
        title: 'Unknown Track',
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Listening to Unknown Track');
  });

  it('formats a reading activity', () => {
    expect(
      formatActivity({
        type: 'reading',
        title: 'One Piece',
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
        secondaryPosterUrl: null,
      }),
    ).toBe('Reading One Piece');
  });
});
