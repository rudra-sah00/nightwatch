import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CONTENT_LENGTH,
  MAX_GIFS,
  MAX_TAGS,
  useComposerStore,
} from '@/features/explore/store/use-composer-store';
import type { PostTag } from '@/features/explore/types';

const makeTag = (id: string): PostTag => ({
  type: 'movie',
  id,
  title: `Tag ${id}`,
});

describe('useComposerStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.reset();
    });
  });

  it('setContent respects max length', () => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.setContent('hello');
    });
    expect(result.current.content).toBe('hello');

    const tooLong = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
    act(() => {
      result.current.setContent(tooLong);
    });
    expect(result.current.content).toBe('hello');
  });

  it('addTag enforces max 5 tags', () => {
    const { result } = renderHook(() => useComposerStore());
    for (let i = 0; i < MAX_TAGS + 2; i++) {
      act(() => {
        result.current.addTag(makeTag(`t${i}`));
      });
    }
    expect(result.current.tags).toHaveLength(MAX_TAGS);
  });

  it('addTag prevents duplicates', () => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.addTag(makeTag('x'));
    });
    act(() => {
      result.current.addTag(makeTag('x'));
    });
    expect(result.current.tags).toHaveLength(1);
  });

  it('addGif enforces max 4 gifs', () => {
    const { result } = renderHook(() => useComposerStore());
    for (let i = 0; i < MAX_GIFS + 2; i++) {
      act(() => {
        result.current.addGif(`http://gif${i}.gif`);
      });
    }
    expect(result.current.gifs).toHaveLength(MAX_GIFS);
  });

  it('canSubmit returns false when empty', () => {
    const { result } = renderHook(() => useComposerStore());
    expect(result.current.canSubmit()).toBe(false);
  });

  it('canSubmit returns true with content', () => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.setContent('hi');
    });
    expect(result.current.canSubmit()).toBe(true);
  });

  it('canSubmit returns false while submitting', () => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.setContent('hi');
      result.current.setSubmitting(true);
    });
    expect(result.current.canSubmit()).toBe(false);
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => useComposerStore());
    act(() => {
      result.current.setContent('hello');
      result.current.addTag(makeTag('t1'));
      result.current.addGif('http://gif.gif');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.content).toBe('');
    expect(result.current.tags).toHaveLength(0);
    expect(result.current.gifs).toHaveLength(0);
  });
});
