import { describe, expect, it } from 'vitest';
import { formatActivity } from '@/features/friends/format-activity';

describe('formatActivity', () => {
  it('formats a movie activity', () => {
    expect(
      formatActivity({
        type: 'movie',
        title: 'Inception',
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
      }),
    ).toBe('Watching Inception');
  });

  it('formats a series activity with season and episode', () => {
    expect(
      formatActivity({
        type: 'series',
        title: 'Breaking Bad',
        season: 2,
        episode: 3,
        episodeTitle: 'Bit by a Dead Bee',
        posterUrl: 'https://example.com/poster.jpg',
      }),
    ).toBe('Watching Breaking Bad S2E3');
  });

  it('formats a series without season/episode as movie-style', () => {
    expect(
      formatActivity({
        type: 'series',
        title: 'Stranger Things',
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
      }),
    ).toBe('Watching Stranger Things');
  });

  it('formats a livestream activity', () => {
    expect(
      formatActivity({
        type: 'livestream',
        title: 'Live Event',
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: null,
      }),
    ).toBe('Watching Live Event');
  });
});
