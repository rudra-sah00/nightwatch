/**
 * Failing-test suite pinning down every defect in the watch-party sketch
 * drawing pipeline. Written before the fix; each `it` maps to one defect.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';
import { useSketchOverlay } from '@/features/watch-party/interactions/hooks/use-sketch-overlay';
import { dispatchRtmMessage } from '@/features/watch-party/room/services/watch-party.api';
import type { SketchAction } from '@/features/watch-party/room/types';

let pointer = { x: 0, y: 0 };

vi.mock('react-konva', () => {
  const mkStage = () => ({
    getPointerPosition: () => pointer,
    width: () => 800,
    height: () => 450,
    findOne: () => undefined,
  });
  const stub = (testid: string) => (props: Record<string, unknown>) => (
    <div
      data-testid={testid}
      data-points={JSON.stringify(props.points ?? null)}
      data-opacity={String(props.opacity)}
      data-draggable={String(props.draggable)}
    />
  );
  return {
    Stage: ({
      children,
      width,
      height,
      onMouseDown,
      onMousemove,
      onMouseup,
    }: {
      width: number;
      height: number;
      onMouseDown: (e?: unknown) => void;
      onMousemove: (e?: unknown) => void;
      onMouseup: (e?: unknown) => void;
      children: ReactNode;
    }) => (
      // biome-ignore lint/a11y/noStaticElementInteractions: test stub
      <div
        data-testid="konva-stage"
        data-width={String(width)}
        data-height={String(height)}
        onMouseDown={() => onMouseDown({ target: { getStage: mkStage } })}
        onMouseMove={() => onMousemove({ target: { getStage: mkStage } })}
        onMouseUp={() => onMouseup({ target: { getStage: mkStage } })}
      >
        {children}
      </div>
    ),
    Layer: ({ children }: { children: ReactNode }) => (
      <div data-testid="konva-layer">{children}</div>
    ),
    Line: stub('konva-line'),
    Rect: stub('konva-rect'),
    Circle: stub('konva-circle'),
    Arrow: stub('konva-arrow'),
    Text: (props: { text?: string }) => (
      <div data-testid="konva-text">{props.text}</div>
    ),
    RegularPolygon: stub('konva-poly'),
    Group: ({ children }: { children: ReactNode }) => (
      <div data-testid="konva-group">{children}</div>
    ),
    Label: ({ children }: { children: ReactNode }) => (
      <div data-testid="konva-label">{children}</div>
    ),
    Tag: stub('konva-tag'),
    Transformer: stub('konva-transformer'),
    Star: stub('konva-star'),
  };
});

/** Mirrors WatchPartySketch, which calls the hook with no options. */
function SidebarPanelStub() {
  useSketchOverlay();
  return null;
}

function Controls({ opacity = 1 }: { opacity?: number }) {
  const {
    setIsSketchMode,
    setCanDraw,
    setCurrentTool,
    setOpacity,
    triggerUndo,
    triggerClear,
    triggerClearSelf,
    setSelectedId,
    actions,
  } = useSketch();
  return (
    <div>
      <button
        type="button"
        data-testid="enable"
        onClick={() => {
          setIsSketchMode(true);
          setCanDraw(true);
          setCurrentTool('freehand');
          setOpacity(opacity);
        }}
      />
      <button type="button" data-testid="undo" onClick={triggerUndo} />
      <button type="button" data-testid="clear" onClick={triggerClear} />
      <button
        type="button"
        data-testid="clear-self"
        onClick={triggerClearSelf}
      />
      <button
        type="button"
        data-testid="select-tool"
        onClick={() => setCurrentTool('select')}
      />
      <button
        type="button"
        data-testid="select-something"
        onClick={() => setSelectedId('some-node')}
      />
      <span data-testid="count">{actions.length}</span>
      <span data-testid="ids">
        {actions.map((a) => a.userId ?? '-').join(',')}
      </span>
    </div>
  );
}

function setup(opts: { opacity?: number } = {}) {
  const send = vi.fn();
  const view = render(
    <SketchProvider>
      <Controls opacity={opts.opacity} />
      <SidebarPanelStub />
      <SketchOverlay rtmSendMessage={send} userId="u1" userName="Me" />
    </SketchProvider>,
  );
  act(() => {
    fireEvent.click(screen.getByTestId('enable'));
  });
  return { send, view };
}

function drawStroke(from = { x: 10, y: 10 }, to = { x: 40, y: 50 }) {
  const stage = screen.getByTestId('konva-stage');
  act(() => {
    pointer = from;
    fireEvent.mouseDown(stage);
  });
  act(() => {
    pointer = to;
    fireEvent.mouseMove(stage);
  });
  act(() => {
    fireEvent.mouseUp(stage);
  });
}

const remoteAction = (id: string): SketchAction => ({
  id,
  type: 'freehand',
  color: '#00ff00',
  strokeWidth: 4,
  videoTimestamp: 0,
  data: [100, 100, 120, 120],
  userId: 'u2',
  userName: 'Other',
});

describe('watch-party sketch defects', () => {
  beforeEach(() => {
    pointer = { x: 0, y: 0 };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('D0: a freehand stroke renders while dragging and survives mouse-up', () => {
    const { send } = setup();
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      pointer = { x: 10, y: 10 };
      fireEvent.mouseDown(stage);
    });
    act(() => {
      pointer = { x: 40, y: 50 };
      fireEvent.mouseMove(stage);
    });

    const mid = screen.getAllByTestId('konva-line');
    expect(mid.length).toBeGreaterThan(0);
    expect(mid[0].getAttribute('data-points')).toBe('[10,10,40,50]');

    act(() => {
      fireEvent.mouseUp(stage);
    });
    expect(screen.getAllByTestId('konva-line').length).toBeGreaterThan(0);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SKETCH_DRAW',
        action: expect.objectContaining({ type: 'freehand', userId: 'u1' }),
      }),
    );
  });

  it('D1: undo effect must not re-fire when selectedId changes', () => {
    setup();
    drawStroke({ x: 10, y: 10 }, { x: 20, y: 20 });
    drawStroke({ x: 30, y: 30 }, { x: 40, y: 40 });
    drawStroke({ x: 50, y: 50 }, { x: 60, y: 60 });
    expect(screen.getByTestId('count').textContent).toBe('3');

    act(() => {
      fireEvent.click(screen.getByTestId('undo'));
    });
    expect(screen.getByTestId('count').textContent).toBe('2');

    act(() => {
      fireEvent.click(screen.getByTestId('select-something'));
    });
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('D2: local action must carry userId so it is selectable/draggable', () => {
    setup();
    drawStroke();
    expect(screen.getByTestId('ids').textContent).toBe('u1');
  });

  it('D3: a remote stroke arriving mid-draw must not be swallowed', () => {
    setup();
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      pointer = { x: 10, y: 10 };
      fireEvent.mouseDown(stage);
    });
    // Remote peer's stroke lands while we are still dragging.
    act(() => {
      dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: remoteAction('remote-1'),
      } as never);
    });
    act(() => {
      pointer = { x: 40, y: 50 };
      fireEvent.mouseMove(stage);
    });
    act(() => {
      fireEvent.mouseUp(stage);
    });

    // Our stroke + the remote stroke, both intact.
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('ids').textContent).toBe('u1,u2');
  });

  it('D4: opacity slider must apply to freehand strokes', () => {
    setup({ opacity: 0.3 });
    drawStroke();
    const line = screen.getAllByTestId('konva-line')[0];
    expect(line.getAttribute('data-opacity')).toBe('0.3');
  });

  it('D5: "clear mine" must delete my strokes and keep remote ones', () => {
    setup();
    drawStroke();
    act(() => {
      dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: remoteAction('remote-1'),
      } as never);
    });
    expect(screen.getByTestId('count').textContent).toBe('2');

    act(() => {
      fireEvent.click(screen.getByTestId('clear-self'));
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('ids').textContent).toBe('u2');
  });

  it('D6: stage resizes with its container (not only on window resize)', async () => {
    // Capture the observer so we can fire it without relying on happy-dom
    // performing real layout.
    const observed: Element[] = [];
    let trigger: (() => void) | undefined;
    const original = globalThis.ResizeObserver;
    class StubResizeObserver {
      constructor(cb: () => void) {
        trigger = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver;

    try {
      setup();

      const container = screen.getByTestId('konva-stage').parentElement;
      if (!container) throw new Error('no container');

      // The hook must observe its own container element, not just `window`.
      expect(observed).toContain(container);

      Object.defineProperty(container, 'offsetWidth', {
        configurable: true,
        value: 640,
      });
      Object.defineProperty(container, 'offsetHeight', {
        configurable: true,
        value: 360,
      });

      // Sidebar collapse: the element's box changes, `window` never resizes.
      await act(async () => {
        trigger?.();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });

      const stage = screen.getByTestId('konva-stage');
      expect(stage.getAttribute('data-width')).toBe('640');
      expect(stage.getAttribute('data-height')).toBe('360');
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
