import { describe, expect, it } from 'vitest';
import type {
  PlayMovieParams,
  PlayParams,
  PlaySeriesParams,
} from '@/features/search/api';

describe('PlayMovieParams Type', () => {
  it('creates valid movie play params', () => {
    const params: PlayMovieParams = {
      title: 'The Dark Knight',
      type: 'movie',
      duration: 7200,
    };

    expect(params.type).toBe('movie');
    expect(params.title).toBe('The Dark Knight');
  });
});

describe('PlaySeriesParams Type', () => {
  it('creates valid series play params', () => {
    const params: PlaySeriesParams = {
      title: 'Breaking Bad',
      type: 'series',
      season: 1,
      episode: 1,
      duration: 2400,
    };

    expect(params.type).toBe('series');
    expect(params.title).toBe('Breaking Bad');
    expect(params.season).toBe(1);
    expect(params.episode).toBe(1);
  });
});

describe('PlayParams Union Type', () => {
  it('accepts movie params', () => {
    const params: PlayParams = {
      title: 'The Matrix',
      type: 'movie',
    };

    expect(params.type).toBe('movie');
  });

  it('accepts series params', () => {
    const params: PlayParams = {
      title: 'Game of Thrones',
      type: 'series',
      season: 1,
      episode: 1,
    };

    expect(params.type).toBe('series');
  });

  it('discriminates by type', () => {
    const movieParams: PlayParams = {
      title: 'Inception',
      type: 'movie',
    };

    const seriesParams: PlayParams = {
      title: 'The Wire',
      type: 'series',
      season: 1,
      episode: 1,
    };

    if (movieParams.type === 'movie') {
      expect(movieParams.title).toBe('Inception');
    }

    if (seriesParams.type === 'series') {
      expect(seriesParams.season).toBe(1);
    }
  });
});
