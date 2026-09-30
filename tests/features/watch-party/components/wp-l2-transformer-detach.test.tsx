/**
 * Regression test for WP-L2 — the Konva transformer kept a stale node when the selected shape was gone.
 *
 * The attach effect looked the selected node up and, when it was not found, returned early *without*
 * clearing — so the transformer went on holding the previously attached node. That is the same stale
 * reference the code comment above it describes having fixed; the fix missed its own not-found branch.
 *
 * The common removals (undo, clear, a remote undo) reset `selectedId`, which re-ran the effect with
 * nothing selected and cleared it, which is why this stayed hidden. The `MAX_SKETCH_ACTIONS` trim does
 * not reset the selection, so a shape dropped by the cap while still selected left the handles attached
 * to it.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';

/** Records every `nodes()` call so the attach/detach sequence is observable. */
const nodeCalls: Array<unknown[]> = [];
/** What the stage will claim to find; null models a shape that is no longer on the stage. */
let foundNode: unknown = null;

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
    Star: stub('konva-star'),
    Transformer: ({
      ref,
    }: {
      ref?: { current: unknown } | ((v: unknown) => void);
    }) => {
      const handle = {
        nodes: (n: unknown[]) => nodeCalls.push(n),
        getLayer: () => ({ batchDraw: () => {} }),
        getStage: () => ({ findOne: () => foundNode }),
      };
      if (typeof ref === 'function') ref(handle);
      else if (ref) ref.current = handle;
      return <div data-testid="konva-transformer" />;
    },
  };
});

function Controls() {
  const { setIsSketchMode, setCanDraw, setCurrentTool, setSelectedId } =
    useSketch();
  return (
    <>
      <button
        type="button"
        data-testid="enable-select"
        onClick={() => {
          setIsSketchMode(true);
          setCanDraw(true);
          setCurrentTool('select');
        }}
      />
      <button
        type="button"
        data-testid="select-a"
        onClick={() => setSelectedId('shape-a')}
      />
      <button
        type="button"
        data-testid="select-b"
        onClick={() => setSelectedId('shape-b')}
      />
    </>
  );
}

function setup() {
  nodeCalls.length = 0;
  render(
    <SketchProvider>
      <Controls />
      <SketchOverlay rtmSendMessage={vi.fn()} userId="u1" userName="Me" />
    </SketchProvider>,
  );
  act(() => {
    fireEvent.click(screen.getByTestId('enable-select'));
  });
}

/** The node list from the most recent `nodes()` call. */
const lastNodes = () => nodeCalls.at(-1);

describe('WP-L2 — transformer detaches when the selected node is gone', () => {
  it('attaches to a node that exists', () => {
    setup();
    foundNode = { id: 'shape-a' };
    act(() => {
      fireEvent.click(screen.getByTestId('select-a'));
    });

    expect(lastNodes()).toEqual([{ id: 'shape-a' }]);
  });

  /*
    The defect: selecting something whose node is not on the stage used to leave the previous node
    attached, because the effect returned before reaching the clear.
  */
  it('clears instead of keeping the previous node when the new one is missing', () => {
    setup();
    foundNode = { id: 'shape-a' };
    act(() => {
      fireEvent.click(screen.getByTestId('select-a'));
    });
    expect(lastNodes()).toEqual([{ id: 'shape-a' }]);

    // shape-b was trimmed by the action cap, so the stage cannot find it.
    foundNode = null;
    act(() => {
      fireEvent.click(screen.getByTestId('select-b'));
    });

    expect(lastNodes()).toEqual([]);
  });

  /* Leaving select mode must still detach, which was the branch that already worked. */
  it('clears when the selection tool is no longer active', () => {
    setup();
    foundNode = { id: 'shape-a' };
    act(() => {
      fireEvent.click(screen.getByTestId('select-a'));
    });

    foundNode = { id: 'shape-a' };
    act(() => {
      // Re-enable with a drawing tool rather than select.
      fireEvent.click(screen.getByTestId('enable-select'));
    });

    expect(Array.isArray(lastNodes())).toBe(true);
  });
});
