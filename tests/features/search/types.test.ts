import { describe, expect, it } from 'vitest';
import type {
  Episode,
  SearchResult,
  Season,
  ShowDetails,
} from '@/features/search/types';
import { ContentType as ContentTypeEnum } from '@/features/search/types';

describe('Search Types', () => {
  it('creates valid Episode type', () => {
    const episode: Episode = {
      episodeId: 'ep-1',
      seriesId: 'series-1',
      episodeNumber: 1,
      seasonNumber: 1,
      title: 'Pilot',
      description: 'First episode',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 2700,
    };

    expect(episode.episodeId).toBe('ep-1');
    expect(episode.seriesId).toBe('series-1');
    expect(episode.episodeNumber).toBe(1);
    expect(episode.title).toBe('Pilot');
    expect(episode.duration).toBe(2700);
  });

  it('creates valid Season type', () => {
    const season: Season = {
      seasonId: 's-1',
      seasonNumber: 1,
      episodeCount: 10,
    };

    expect(season.seasonId).toBe('s-1');
    expect(season.seasonNumber).toBe(1);
    expect(season.episodeCount).toBe(10);
  });

  it('creates valid ShowDetails for series', () => {
    const show: ShowDetails = {
      id: 'show-1',
      title: 'Breaking Bad',
      description: 'A chemistry teacher turns to crime',
      contentType: ContentTypeEnum.Series,
      posterUrl: 'https://example.com/poster.jpg',
      posterHdUrl: 'https://example.com/poster-hd.jpg',
      seasons: [],
      episodes: [],
      year: '2008',
      rating: '9.5',
    };

    expect(show.contentType).toBe(ContentTypeEnum.Series);
    expect(show.title).toBe('Breaking Bad');
    expect(show.rating).toBe('9.5');
  });

  it('creates valid ShowDetails for movie', () => {
    const movie: ShowDetails = {
      id: 'movie-1',
      title: 'The Dark Knight',
      description: 'Batman fights the Joker',
      contentType: ContentTypeEnum.Movie,
      posterUrl: 'https://example.com/poster.jpg',
      posterHdUrl: 'https://example.com/poster-hd.jpg',
      runtime: '152 min',
      seasons: [],
      episodes: [],
      year: '2008',
      rating: '9.0',
    };

    expect(movie.contentType).toBe(ContentTypeEnum.Movie);
    expect(movie.runtime).toBe('152 min');
  });

  it('creates valid SearchResult', () => {
    const result: SearchResult = {
      id: 'result-1',
      title: 'Test Show',
      contentType: ContentTypeEnum.Series,
      poster: 'https://example.com/poster.jpg',
      year: 2024,
    };

    expect(result.id).toBe('result-1');
    expect(result.contentType).toBe(ContentTypeEnum.Series);
    expect(result.year).toBe(2024);
  });

  it('ContentType enum has correct values', () => {
    expect(ContentTypeEnum.Movie).toBe('Movie');
    expect(ContentTypeEnum.Series).toBe('Series');
  });
});
