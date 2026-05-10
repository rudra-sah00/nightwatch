import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/fetch', () => ({
  apiFetch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/features/music/api', () => ({
  addToUserQueue: vi.fn().mockResolvedValue([]),
  getUserQueue: vi.fn().mockResolvedValue([]),
}));

import {
  addToQueue,
  generateShuffleOrder,
  getNextIndex,
  getPrevIndex,
  playNextInQueue,
  removeFromQueue,
} from '@/features/music/engine/queue';
import type { EngineContext } from '@/features/music/engine/types';

function createMockCtx(
  overrides: Partial<EngineContext['state']> = {},
): EngineContext {
  const state = {
    currentTrack: {
      id: 't1',
      title: 'T1',
      artist: 'A',
      album: 'B',
      albumId: 'a1',
      duration: 200,
      image: '',
      language: 'en',
      year: 2024,
      hasLyrics: false,
    },
    queue: [
      {
        id: 't1',
        title: 'T1',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      },
      {
        id: 't2',
        title: 'T2',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      },
      {
        id: 't3',
        title: 'T3',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      },
    ],
    queueIndex: 0,
    isPlaying: true,
    progress: 50,
    duration: 200,
    shuffle: false,
    repeat: 'off' as const,
    volume: 1,
    crossfadeDuration: 0,
    gapless: true,
    sleepTimerEnd: null,
    ...overrides,
  };
  return {
    audio: {} as HTMLAudioElement,
    nextAudio: null,
    state,
    playId: 1,
    crossfadeActive: false,
    crossfadeAborted: false,
    shuffledOrder: [],
    audioContext: null,
    sourceNode: null,
    sourceNodes: new WeakMap(),
    eqFilters: [],
    eqBands: [],
    sleepTimerHandle: null,
    progressInterval: null,
    listeners: new Set(),
    update: (partial) => {
      Object.assign(state, partial);
    },
    setAudio: vi.fn(),
    setNextAudio: vi.fn(),
    incrementPlayId: () => ++state.queueIndex, // dummy
  };
}

describe('queue module', () => {
  describe('getNextIndex', () => {
    it('returns next index in linear mode', () => {
      const ctx = createMockCtx({ queueIndex: 0 });
      expect(getNextIndex(ctx)).toBe(1);
    });

    it('returns null at end of queue with repeat off', () => {
      const ctx = createMockCtx({ queueIndex: 2 });
      expect(getNextIndex(ctx)).toBeNull();
    });

    it('wraps to 0 with repeat all', () => {
      const ctx = createMockCtx({ queueIndex: 2, repeat: 'all' });
      expect(getNextIndex(ctx)).toBe(0);
    });

    it('follows shuffle order', () => {
      const ctx = createMockCtx({ queueIndex: 0, shuffle: true });
      ctx.shuffledOrder = [0, 2, 1];
      expect(getNextIndex(ctx)).toBe(2);
    });

    it('returns null at end of shuffle with repeat off', () => {
      const ctx = createMockCtx({ queueIndex: 1, shuffle: true });
      ctx.shuffledOrder = [0, 2, 1]; // position of 1 is index 2 (last)
      expect(getNextIndex(ctx)).toBeNull();
    });

    it('returns null for empty queue', () => {
      const ctx = createMockCtx({ queue: [], queueIndex: -1 });
      expect(getNextIndex(ctx)).toBeNull();
    });
  });

  describe('getPrevIndex', () => {
    it('returns previous index', () => {
      const ctx = createMockCtx({ queueIndex: 2 });
      expect(getPrevIndex(ctx)).toBe(1);
    });

    it('returns null at start of queue', () => {
      const ctx = createMockCtx({ queueIndex: 0 });
      expect(getPrevIndex(ctx)).toBeNull();
    });

    it('follows shuffle order backwards', () => {
      const ctx = createMockCtx({ queueIndex: 2, shuffle: true });
      ctx.shuffledOrder = [0, 2, 1];
      // queueIndex 2 is at position 1 in shuffledOrder, prev is position 0 = index 0
      expect(getPrevIndex(ctx)).toBe(0);
    });

    it('returns null at start of shuffle order', () => {
      const ctx = createMockCtx({ queueIndex: 0, shuffle: true });
      ctx.shuffledOrder = [0, 2, 1];
      expect(getPrevIndex(ctx)).toBeNull();
    });
  });

  describe('generateShuffleOrder', () => {
    it('puts current index first', () => {
      const order = generateShuffleOrder(5, 2);
      expect(order[0]).toBe(2);
      expect(order.length).toBe(5);
    });

    it('contains all indices', () => {
      const order = generateShuffleOrder(5, 0);
      expect(order.sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('handles single-element queue', () => {
      const order = generateShuffleOrder(1, 0);
      expect(order).toEqual([0]);
    });
  });

  describe('addToQueue', () => {
    it('appends track to queue', () => {
      const ctx = createMockCtx();
      const newTrack = {
        id: 't4',
        title: 'T4',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      };
      addToQueue(ctx, newTrack);
      expect(ctx.state.queue.length).toBe(4);
      expect(ctx.state.queue[3].id).toBe('t4');
    });

    it('updates shuffle order when shuffle is active', () => {
      const ctx = createMockCtx({ shuffle: true, queueIndex: 0 });
      ctx.shuffledOrder = [0, 2, 1];
      const newTrack = {
        id: 't4',
        title: 'T4',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      };
      addToQueue(ctx, newTrack);
      expect(ctx.shuffledOrder).toContain(3);
      expect(ctx.shuffledOrder.length).toBe(4);
    });
  });

  describe('playNextInQueue', () => {
    it('inserts track after current', () => {
      const ctx = createMockCtx({ queueIndex: 0 });
      const newTrack = {
        id: 't4',
        title: 'T4',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      };
      playNextInQueue(ctx, newTrack);
      expect(ctx.state.queue[1].id).toBe('t4');
      expect(ctx.state.queue.length).toBe(4);
    });

    it('shifts shuffle indices when inserting', () => {
      const ctx = createMockCtx({ shuffle: true, queueIndex: 0 });
      ctx.shuffledOrder = [0, 2, 1];
      const newTrack = {
        id: 't4',
        title: 'T4',
        artist: 'A',
        album: 'B',
        albumId: 'a1',
        duration: 200,
        image: '',
        language: 'en',
        year: 2024,
        hasLyrics: false,
      };
      playNextInQueue(ctx, newTrack);
      // Indices >= 1 should be shifted up by 1
      // Original [0, 2, 1] → [0, 3, 2] then insert 1 after position 0 → [0, 1, 3, 2]
      expect(ctx.shuffledOrder[0]).toBe(0);
      expect(ctx.shuffledOrder[1]).toBe(1); // inserted
      expect(ctx.shuffledOrder).toContain(3); // old 2 shifted to 3
      expect(ctx.shuffledOrder).toContain(2); // old 1 shifted to 2
    });
  });

  describe('removeFromQueue', () => {
    it('removes track and adjusts queueIndex', () => {
      const ctx = createMockCtx({ queueIndex: 2 });
      removeFromQueue(ctx, 0);
      expect(ctx.state.queue.length).toBe(2);
      expect(ctx.state.queueIndex).toBe(1); // shifted down
    });

    it('does not remove currently playing track', () => {
      const ctx = createMockCtx({ queueIndex: 1 });
      removeFromQueue(ctx, 1);
      expect(ctx.state.queue.length).toBe(3); // unchanged
    });

    it('updates shuffle order on remove', () => {
      const ctx = createMockCtx({ shuffle: true, queueIndex: 0 });
      ctx.shuffledOrder = [0, 2, 1];
      removeFromQueue(ctx, 2);
      expect(ctx.shuffledOrder).not.toContain(2);
      expect(ctx.shuffledOrder.length).toBe(2);
    });

    it('aborts crossfade if removing crossfade target', () => {
      const ctx = createMockCtx({ queueIndex: 0 });
      ctx.crossfadeActive = true;
      ctx.nextAudio = {
        pause: vi.fn(),
        src: '',
      } as unknown as HTMLAudioElement;
      ctx.shuffledOrder = [];
      // getNextIndex returns 1 for queueIndex 0
      removeFromQueue(ctx, 1);
      expect(ctx.crossfadeAborted).toBe(true);
      expect(ctx.crossfadeActive).toBe(false);
    });

    it('does nothing for out-of-bounds index', () => {
      const ctx = createMockCtx();
      removeFromQueue(ctx, -1);
      expect(ctx.state.queue.length).toBe(3);
      removeFromQueue(ctx, 99);
      expect(ctx.state.queue.length).toBe(3);
    });
  });
});
