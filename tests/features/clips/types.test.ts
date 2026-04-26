import { describe, expect, it } from 'vitest';
import type {
  Clip,
  ClipSegment,
  ClipStatus,
  ClipsResponse,
} from '@/features/clips/types';

describe('Clips Types', () => {
  it('ClipStatus has valid values', () => {
    const statuses: ClipStatus[] = [
      'recording',
      'processing',
      'ready',
      'failed',
    ];
    expect(statuses).toHaveLength(4);
  });

  it('ClipSegment has required fields', () => {
    const seg: ClipSegment = {
      url: 'https://cdn/seg.ts',
      startTime: 0,
      duration: 2.5,
    };
    expect(seg.url).toBe('https://cdn/seg.ts');
    expect(seg.startTime).toBe(0);
    expect(seg.duration).toBe(2.5);
  });

  it('Clip has required fields', () => {
    const clip: Clip = {
      id: 'c1',
      title: 'My Clip',
      thumbnailUrl: 'https://s3/thumb.jpg',
      videoUrl: 'https://s3/video.mp4',
      duration: 120,
      status: 'ready',
      matchId: 'm1',
      isPublic: false,
      shareId: null,
      createdAt: '2026-04-26T00:00:00Z',
    };
    expect(clip.id).toBe('c1');
    expect(clip.status).toBe('ready');
    expect(clip.duration).toBe(120);
  });

  it('Clip with null urls (processing state)', () => {
    const clip: Clip = {
      id: 'c2',
      title: 'Processing Clip',
      thumbnailUrl: null,
      videoUrl: null,
      duration: 0,
      status: 'processing',
      matchId: 'm1',
      isPublic: false,
      shareId: null,
      createdAt: '2026-04-26T00:00:00Z',
    };
    expect(clip.thumbnailUrl).toBeNull();
    expect(clip.videoUrl).toBeNull();
  });

  it('ClipsResponse has pagination fields', () => {
    const res: ClipsResponse = {
      clips: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    expect(res.clips).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(0);
  });

  it('ClipsResponse with clips', () => {
    const res: ClipsResponse = {
      clips: [
        {
          id: 'c1',
          title: 'Clip 1',
          thumbnailUrl: null,
          videoUrl: null,
          duration: 60,
          status: 'ready',
          matchId: 'm1',
          isPublic: false,
          shareId: null,
          createdAt: '2026-04-26T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };
    expect(res.clips).toHaveLength(1);
    expect(res.total).toBe(1);
  });
});
