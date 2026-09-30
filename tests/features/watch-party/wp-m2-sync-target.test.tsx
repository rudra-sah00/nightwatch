/**
 * Regression test for AUDIT.md WP-M2 — `SKETCH_SYNC_STATE` carried a `targetId` nobody read.
 *
 * The host answers a joining guest's `SKETCH_REQUEST_SYNC` with the whole canvas, addressed to that
 * one requester via `targetId`. The field was set and read nowhere in `src/`: the receive handler
 * discarded it and applied `elements` regardless of who the message was for.
 *
 * Latent while delivery stays peer-to-peer, since only the addressed guest receives it. But the
 * correctness of the whole mechanism then rests on the transport call being the peer variant, and
 * the field looks like an access check while being none — so a broadcast from any client holding
 * `canDraw` replaces every member's canvas with state meant for one joiner.
 *
 * A message with no `targetId` is still applied: older clients omit it, and receiving the join sync
 * matters more than the check.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';
import {
  dispatchRtmMessage,
  onSketchSyncState,
} from '@/features/watch-party/room/services/rtm-events';
import type { SketchAction } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

vi.mock('react-konva', () => {
  const stub = (testid: string) => () => <div data-testid={testid} />;
  return {
    Stage: ({ children }: { children: ReactNode }) => (
      <div data-testid="konva-stage">{children}</div>
    ),
    Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Line: stub('konva-line'),
    Rect: stub('konva-rect'),
    Circle: stub('konva-circle'),
    Arrow: stub('konva-arrow'),
    Text: stub('konva-text'),
    RegularPolygon: stub('konva-poly'),
    Group: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Label: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Tag: stub('konva-tag'),
    Transformer: stub('konva-transformer'),
    Star: stub('konva-star'),
  };
});

function action(id: string): SketchAction {
  return {
    id,
    type: 'freehand',
    color: '#fff',
    strokeWidth: 2,
    videoTimestamp: 0,
    data: [0, 0],
    userId: 'H1',
  } as unknown as SketchAction;
}

function Readout() {
  const { actions, setIsSketchMode, setCanDraw } = useSketch();
  return (
    <>
      <button
        type="button"
        data-testid="enable"
        onClick={() => {
          setIsSketchMode(true);
          setCanDraw(true);
        }}
      />
      <span data-testid="ids">{actions.map((a) => a.id).join(',')}</span>
    </>
  );
}

/** Mounts the real overlay as user `u1`. */
function setup() {
  render(
    <SketchProvider>
      <Readout />
      <SketchOverlay rtmSendMessage={vi.fn()} userId="u1" userName="Me" />
    </SketchProvider>,
  );
  act(() => {
    fireEvent.click(screen.getByTestId('enable'));
  });
}

function dispatch(msg: unknown) {
  act(() => {
    dispatchRtmMessage(msg as RTMMessage);
  });
}

const ids = () => screen.getByTestId('ids').textContent;

describe('WP-M2 — SKETCH_SYNC_STATE targetId', () => {
  it('applies a sync addressed to this user', () => {
    setup();
    dispatch({
      type: 'SKETCH_SYNC_STATE',
      elements: [action('mine')],
      targetId: 'u1',
    });
    expect(ids()).toBe('mine');
  });

  /* The defect: a sync meant for a different joiner used to replace this user's canvas. */
  it('ignores a sync addressed to a different user', () => {
    setup();
    dispatch({
      type: 'SKETCH_SYNC_STATE',
      elements: [action('theirs')],
      targetId: 'someone-else',
    });
    expect(ids()).toBe('');
  });

  /* And it must not cost this user a canvas they already had. */
  it('leaves an existing canvas untouched when the sync is for someone else', () => {
    setup();
    dispatch({
      type: 'SKETCH_SYNC_STATE',
      elements: [action('mine')],
      targetId: 'u1',
    });
    expect(ids()).toBe('mine');

    dispatch({
      type: 'SKETCH_SYNC_STATE',
      elements: [action('theirs')],
      targetId: 'someone-else',
    });
    expect(ids()).toBe('mine');
  });

  /* Older clients omit the field, and losing the join sync would be worse than the check. */
  it('applies a sync with no targetId at all', () => {
    setup();
    dispatch({ type: 'SKETCH_SYNC_STATE', elements: [action('legacy')] });
    expect(ids()).toBe('legacy');
  });

  /* The transport half: the field has to reach the subscriber for any of the above to be possible. */
  it('forwards targetId to subscribers', () => {
    const seen: Array<{ targetId?: string }> = [];
    const cleanup = onSketchSyncState<SketchAction[]>((data) => {
      seen.push(data as { targetId?: string });
    });
    dispatch({
      type: 'SKETCH_SYNC_STATE',
      elements: [action('a')],
      targetId: 'G9',
    });
    cleanup();
    expect(seen[0]?.targetId).toBe('G9');
  });
});
