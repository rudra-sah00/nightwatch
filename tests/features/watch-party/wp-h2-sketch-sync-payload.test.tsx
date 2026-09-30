/**
 * Regression tests for AUDIT.md WP-H2 — a malformed `SKETCH_SYNC_STATE` corrupted or crashed the
 * shared sketch state on every recipient.
 *
 * Nothing on the RTM receive path validated payload *shape*. Every accessor in `rtm-events.ts` is
 * an `as` cast, and the WP-C1 sender gate answers "may you say this?" rather than "is this
 * well-formed?". `SKETCH_SYNC_STATE` is the only sketch message that replaces the whole action list
 * instead of appending to or filtering it, so it is the only one that could leave the state as
 * something that is not an array.
 *
 * These were written as observation tests first, and the observation corrected the audit. The
 * reasoning had been that a non-array throws at the cap check. Only `undefined` and `null` do. A
 * string has a numeric `length`, and a number and a plain object have `undefined`, so none of the
 * three fails `> MAX_SKETCH_ACTIONS` — each was stored verbatim as the sketch state, with the tree
 * still mounted and nothing logged. That silent case is the worse one: the canvas stayed poisoned
 * until the next legitimate stroke called `prev.findIndex` and threw, far from the cause. Since
 * this message is sent automatically to every joining guest, a single bad payload broke the canvas
 * for the rest of the session.
 *
 * Fixed at two layers, and both are asserted here: `rtm-events.ts` drops a payload whose
 * `elements` is not an array, and `SketchContext`'s setter refuses to store a non-array whoever
 * calls it. Neither coerces to `[]` — an empty canvas is a legitimate state, so coercing would
 * silently wipe the receiver's work instead of ignoring a bad update.
 */
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';
import {
  dispatchRtmMessage,
  onSketchDraw,
  onSketchSyncState,
} from '@/features/watch-party/room/services/rtm-events';
import type { SketchAction } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

/**
 * Mirrors what `use-sketch-overlay.ts` does with both messages: subscribe, and hand the payload
 * straight to the setter. `onSketchDraw` is included because `prev.findIndex` is the operation a
 * poisoned state used to break.
 */
function SyncStateConsumer() {
  const { actions, setActions } = useSketch();
  useEffect(
    () =>
      onSketchSyncState<SketchAction[]>(({ elements }) => {
        setActions(elements);
      }),
    [setActions],
  );
  useEffect(
    () =>
      onSketchDraw<SketchAction>((action) => {
        setActions((prev) => {
          const index = prev.findIndex((a) => a.id === action.id);
          if (index === -1) return [...prev, action];
          const next = [...prev];
          next[index] = action;
          return next;
        });
      }),
    [setActions],
  );

  return (
    <span data-testid="count">
      {Array.isArray(actions) ? actions.length : 'NOT-AN-ARRAY'}
    </span>
  );
}

function mount() {
  return render(
    <SketchProvider>
      <SyncStateConsumer />
    </SketchProvider>,
  );
}

const goodAction = {
  id: 'a1',
  type: 'freehand',
  color: '#fff',
  strokeWidth: 2,
  videoTimestamp: 0,
  data: [0, 0, 1, 1],
  userId: 'G1',
} as unknown as SketchAction;

/** Reports whether the dispatch threw, rather than failing the run. */
function dispatchAndCatch(msg: unknown): unknown {
  try {
    act(() => {
      dispatchRtmMessage(msg as RTMMessage);
    });
    return null;
  } catch (e) {
    return e;
  }
}

function syncState(elements: unknown) {
  return { type: 'SKETCH_SYNC_STATE', elements, targetId: 'G1' };
}

describe('WP-H2 — malformed SKETCH_SYNC_STATE', () => {
  it('still applies a well-formed payload', () => {
    mount();
    expect(dispatchAndCatch(syncState([goodAction]))).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  /*
    An empty array is a legitimate canvas state — the host answering a sync request having drawn
    nothing — and must not be mistaken for a malformed payload.
  */
  it('accepts an empty array as a real canvas state', () => {
    mount();
    expect(dispatchAndCatch(syncState([goodAction]))).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('1');

    expect(dispatchAndCatch(syncState([]))).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  /*
    The five shapes observed in Phase 5. The first two used to throw; the last three used to be
    stored verbatim. All five must now be ignored, leaving the state a valid array.
  */
  it.each([
    ['absent', undefined],
    ['null', null],
    ['a string', 'not-an-array'],
    ['a number', 42],
    ['an object', { 0: goodAction }],
  ])('ignores a payload whose elements is %s', (_label, elements) => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();

    expect(dispatchAndCatch(syncState(elements))).toBeNull();
    consoleSpy.mockRestore();

    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  /* A bad payload must not cost the receiver the canvas it already had. */
  it('leaves an existing canvas untouched when a malformed payload arrives', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();

    dispatchAndCatch(syncState([goodAction]));
    expect(screen.getByTestId('count').textContent).toBe('1');

    for (const bad of [undefined, null, 'x', 7, {}]) {
      expect(dispatchAndCatch(syncState(bad))).toBeNull();
    }
    consoleSpy.mockRestore();

    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  /*
    The consequence that made this HIGH rather than cosmetic: the poisoned state used to survive
    the bad message and take out the *next* legitimate stroke. Drawing must still work after a
    malformed sync.
  */
  it('keeps accepting strokes after a malformed payload', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();

    expect(dispatchAndCatch(syncState('not-an-array'))).toBeNull();
    const thrown = dispatchAndCatch({
      type: 'SKETCH_DRAW',
      action: goodAction,
    });
    consoleSpy.mockRestore();

    expect(thrown).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  /*
    The setter's own invariant, independent of the RTM boundary. Two layers because the boundary
    guard protects this one message and the setter protects the state from every caller — a future
    consumer that reads a payload differently should not be able to reintroduce this.
  */
  it('refuses a non-array from a direct caller, keeping the previous state', () => {
    function DirectCaller() {
      const { actions, setActions } = useSketch();
      return (
        <>
          <span data-testid="count">
            {Array.isArray(actions) ? actions.length : 'NOT-AN-ARRAY'}
          </span>
          <button type="button" onClick={() => setActions([goodAction])}>
            good
          </button>
          <button
            type="button"
            onClick={() => setActions('nope' as unknown as SketchAction[])}
          >
            bad
          </button>
        </>
      );
    }
    render(
      <SketchProvider>
        <DirectCaller />
      </SketchProvider>,
    );

    act(() => {
      screen.getByText('good').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');

    act(() => {
      screen.getByText('bad').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
