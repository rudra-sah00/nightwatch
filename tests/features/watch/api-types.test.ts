import { describe, expect, it } from 'vitest';
import type { ContentProgress, SpriteCue } from '@/features/watch/api';

describe('ContentProgress Type', () => {
  it('creates valid movie progress', () => {
    const progress: ContentProgress = {
      progressSeconds: 1800,
      progressPercent: 25,
    };

    expect(progress.progressSeconds).toBe(1800);
    expect(progress.progressPercent).toBe(25);
    expect(progress.seasonNumber).toBeUndefined();
  });

  it('creates valid series progress', () => {
    const progress: ContentProgress = {
      progressSeconds: 1200,
      progressPercent: 44,
      seasonNumber: 1,
      episodeNumber: 5,
      episodeTitle: 'Episode 5',
    };

    expect(progress.seasonNumber).toBe(1);
    expect(progress.episodeNumber).toBe(5);
    expect(progress.episodeTitle).toBe('Episode 5');
  });

  it('has progress percentage', () => {
    const progress: ContentProgress = {
      progressSeconds: 3600,
      progressPercent: 50,
    };

    expect(progress.progressPercent).toBe(50);
  });

  it('handles zero progress', () => {
    const progress: ContentProgress = {
      progressSeconds: 0,
      progressPercent: 0,
    };

    expect(progress.progressSeconds).toBe(0);
  });

  it('handles completed content', () => {
    const progress: ContentProgress = {
      progressSeconds: 7200,
      progressPercent: 100,
    };

    expect(progress.progressPercent).toBe(100);
  });
});

describe('SpriteCue Type', () => {
  it('creates valid sprite cue', () => {
    const cue: SpriteCue = {
      start: 0,
      end: 10,
      x: 0,
      y: 0,
      w: 160,
      h: 90,
      url: 'https://example.com/sprite.jpg',
    };

    expect(cue.start).toBe(0);
    expect(cue.end).toBe(10);
    expect(cue.w).toBe(160);
    expect(cue.h).toBe(90);
  });

  it('creates sprite cue for middle of video', () => {
    const cue: SpriteCue = {
      start: 300,
      end: 310,
      x: 320,
      y: 180,
      w: 160,
      h: 90,
      url: 'https://example.com/sprite.jpg',
    };

    expect(cue.start).toBe(300);
    expect(cue.x).toBe(320);
    expect(cue.y).toBe(180);
  });

  it('represents 10-second intervals', () => {
    const cues: SpriteCue[] = [
      {
        start: 0,
        end: 10,
        x: 0,
        y: 0,
        w: 160,
        h: 90,
        url: 'https://example.com/sprite.jpg',
      },
      {
        start: 10,
        end: 20,
        x: 160,
        y: 0,
        w: 160,
        h: 90,
        url: 'https://example.com/sprite.jpg',
      },
      {
        start: 20,
        end: 30,
        x: 320,
        y: 0,
        w: 160,
        h: 90,
        url: 'https://example.com/sprite.jpg',
      },
    ];

    expect(cues[0].end - cues[0].start).toBe(10);
    expect(cues[1].end - cues[1].start).toBe(10);
    expect(cues[2].end - cues[2].start).toBe(10);
  });
});
