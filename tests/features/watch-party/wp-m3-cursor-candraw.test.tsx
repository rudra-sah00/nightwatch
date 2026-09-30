/**
 * Regression test for AUDIT.md WP-M3 — members who cannot draw still broadcast cursor positions.
 *
 * `handleMouseMove` broadcast `SKETCH_CURSOR_MOVE` before it consulted `canDraw`, so a member with
 * drawing switched off emitted one every 100 ms while its pointer was over the video. Every
 * recipient then dropped all of them, because `SKETCH_CURSOR_MOVE` is in `DRAW_GATED` and the
 * sender does not hold `canDraw` — guaranteed-wasted traffic on a transport that bills and
 * rate-limits per message. With `canGuestsDraw` defaulting to false this is the common case, not
 * the rare one.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';

let pointer = { x: 0, y: 0 };

vi.mock('react-konva', () => {
  const mkStage = () => ({
    getPointerPosition: () => pointer,
    width: () => 800,
    height: () => 450,
    findOne: () => undefined,
  });
  const stub = (testid: string) => () => <div data-testid={testid} />;
  return {
    Stage: ({
      children,
      onMousemove,
    }: {
      onMousemove: (e?: unknown) => void;
      children: ReactNode;
    }) => (
      // biome-ignore lint/a11y/noStaticElementInteractions: test stub
      <div
        data-testid="konva-stage"
        onMouseMove={() => {
          const stage = mkStage();
          onMousemove({ target: { getStage: () => stage } });
        }}
      >
        {children}
      </div>
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

/** Turns sketch mode on, and drawing permission on or off independently. */
function Controls({ canDraw }: { canDraw: boolean }) {
  const { setIsSketchMode, setCanDraw, setCurrentTool } = useSketch();
  return (
    <button
      type="button"
      data-testid="enable"
      onClick={() => {
        setIsSketchMode(true);
        setCanDraw(canDraw);
        setCurrentTool('freehand');
      }}
    />
  );
}

function setup(canDraw: boolean) {
  const send = vi.fn();
  render(
    <SketchProvider>
      <Controls canDraw={canDraw} />
      <SketchOverlay rtmSendMessage={send} userId="u1" userName="Me" />
    </SketchProvider>,
  );
  act(() => {
    fireEvent.click(screen.getByTestId('enable'));
  });
  return send;
}

/** Moves the pointer far enough apart in time to clear the 100 ms broadcast throttle. */
function movePointer(times: number) {
  for (let i = 0; i < times; i++) {
    pointer = { x: 10 + i * 5, y: 20 + i * 5 };
    vi.setSystemTime(Date.now() + 200);
    act(() => {
      fireEvent.mouseMove(screen.getByTestId('konva-stage'));
    });
  }
}

function cursorMessages(send: ReturnType<typeof vi.fn>) {
  return send.mock.calls.filter(
    ([m]) => (m as { type?: string })?.type === 'SKETCH_CURSOR_MOVE',
  );
}

describe('WP-M3 — cursor broadcasting respects canDraw', () => {
  it('does not broadcast the cursor when the member cannot draw', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const send = setup(false);

    movePointer(5);

    expect(cursorMessages(send)).toHaveLength(0);
    vi.useRealTimers();
  });

  /*
    The other half: a member who *can* draw must still broadcast while merely hovering, since the
    remote cursor is meant to be visible before a stroke starts. A fix that gated this on
    `isDrawing` as well would break that.
  */
  it('still broadcasts the cursor when the member can draw', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const send = setup(true);

    movePointer(3);

    expect(cursorMessages(send).length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
