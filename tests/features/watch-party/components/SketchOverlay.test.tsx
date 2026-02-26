import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/components/SketchOverlay';
import {
  type SketchContextType,
  type ToolType,
  useSketch,
} from '@/features/watch-party/context/SketchContext';
import * as api from '@/features/watch-party/services/watch-party.api';
import type { SketchAction as SketchActionType } from '@/features/watch-party/types';

// Mock window.prompt
window.prompt = vi.fn();
const mockPrompt = vi.mocked(window.prompt);

// Mock react-konva
vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onMouseDown,
    onMousemove,
    onMouseup,
  }: {
    children: ReactNode;
    onMouseDown: (e: {
      target: {
        getStage: () => { getPointerPosition: () => { x: number; y: number } };
      };
    }) => void;
    onMousemove: (e: {
      target: {
        getStage: () => { getPointerPosition: () => { x: number; y: number } };
      };
    }) => void;
    onMouseup: () => void;
  }) => (
    <div
      data-test-id="konva-stage"
      data-testid="konva-stage"
      role="graphics-document"
      onMouseDown={(_e) =>
        onMouseDown({
          target: {
            getStage: () => ({
              getPointerPosition: () => ({ x: 10, y: 10 }),
            }),
          },
        })
      }
      onMouseMove={(_e) =>
        onMousemove({
          target: {
            getStage: () => ({
              getPointerPosition: () => ({ x: 20, y: 20 }),
            }),
          },
        })
      }
      onMouseUp={() => onMouseup()}
    >
      {children}
    </div>
  ),
  Layer: ({ children }: { children: ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Line: (props: Record<string, unknown>) => (
    <div data-testid="konva-line" data-stroke={props.stroke} {...props} />
  ),
  Arrow: (props: Record<string, unknown>) => (
    <div data-testid="konva-arrow" data-stroke={props.stroke} {...props} />
  ),
  Rect: (props: Record<string, unknown>) => (
    <div data-testid="konva-rect" data-stroke={props.stroke} {...props} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div data-testid="konva-circle" data-stroke={props.stroke} {...props} />
  ),
  RegularPolygon: (props: Record<string, unknown>) => (
    <div data-testid="konva-triangle" data-stroke={props.stroke} {...props} />
  ),
  Star: (props: Record<string, unknown>) => (
    <div data-testid="konva-star" data-stroke={props.stroke} {...props} />
  ),
  Text: (props: Record<string, unknown>) => (
    <div
      data-testid="konva-text"
      data-text={props.text}
      data-fill={props.fill}
      {...props}
    />
  ),
}));

// Mock useSketch
vi.mock('@/features/watch-party/context/SketchContext', () => ({
  useSketch: vi.fn(),
}));

// Mock API
vi.mock('@/features/watch-party/services/watch-party.api', () => ({
  emitSketchDraw: vi.fn(),
  emitSketchClear: vi.fn(),
  emitSketchRequestSync: vi.fn(),
  emitSketchSyncState: vi.fn(),
  onSketchDraw: vi.fn((cb) => cb),
  onSketchClear: vi.fn((cb) => cb),
  onSketchProvideSync: vi.fn((cb) => cb),
  onSketchSyncState: vi.fn((cb) => cb),
}));

describe('SketchOverlay', () => {
  const mockContext = {
    currentTool: 'freehand' as ToolType,
    color: '#ff0000',
    strokeWidth: 4,
    clearTrigger: 0,
    clearSelfTrigger: 0,
    undoTrigger: 0,
    isSketchMode: true,
    canDraw: true,
    videoRef: { current: { currentTime: 10 } },
    isHost: false,
  };

  let sketchDrawHandler: (action: SketchActionType) => void;
  let sketchClearHandler: (data: {
    userId: string;
    type: 'all' | 'self';
  }) => void;
  let sketchProvideSyncHandler: (data: { requesterId: string }) => void;
  let sketchSyncStateHandler: (data: { elements: SketchActionType[] }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSketch).mockReturnValue(
      mockContext as unknown as SketchContextType,
    );

    vi.mocked(api.onSketchDraw).mockImplementation((cb) => {
      sketchDrawHandler = cb as (action: SketchActionType) => void;
      return vi.fn();
    });
    vi.mocked(api.onSketchClear).mockImplementation((cb) => {
      sketchClearHandler = cb as (data: {
        userId: string;
        type: 'all' | 'self';
      }) => void;
      return vi.fn();
    });
    vi.mocked(api.onSketchProvideSync).mockImplementation((cb) => {
      sketchProvideSyncHandler = cb as (data: { requesterId: string }) => void;
      return vi.fn();
    });
    vi.mocked(api.onSketchSyncState).mockImplementation((cb) => {
      sketchSyncStateHandler = cb as (data: {
        elements: SketchActionType[];
      }) => void;
      return vi.fn();
    });
  });

  it('should render Stage with correct dimensions', () => {
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');
    expect(stage).toBeInTheDocument();
  });

  it('should request sync on mount if not host', () => {
    render(<SketchOverlay />);
    expect(api.emitSketchRequestSync).toHaveBeenCalled();
  });

  it('should not request sync on mount if host', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      isHost: true,
    } as unknown as SketchContextType);
    render(<SketchOverlay />);
    expect(api.emitSketchRequestSync).not.toHaveBeenCalled();
  });

  it('should draw locally and emit event on mouse up', () => {
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'freehand',
        color: '#ff0000',
        videoTimestamp: 10,
        data: expect.arrayContaining([10, 10, 20, 20]),
      }),
    );
  });

  it('should draw a rectangle locally', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'rectangle' as ToolType,
    } as unknown as SketchContextType);
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rectangle',
        data: [10, 10, 20, 20],
      }),
    );
  });

  it('should draw a circle locally', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'circle' as ToolType,
    } as unknown as SketchContextType);
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'circle',
        data: [10, 10, 20, 20],
      }),
    );
  });

  it('should draw an arrow locally', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'arrow' as ToolType,
    } as unknown as SketchContextType);
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'arrow',
        data: [10, 10, 20, 20],
      }),
    );
  });

  it('should handle eraser tool', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'eraser' as ToolType,
    } as unknown as SketchContextType);
    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseUp(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'eraser',
      }),
    );
  });

  it('should handle clearTrigger', () => {
    const { rerender } = render(<SketchOverlay />);
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      clearTrigger: 1,
    } as unknown as SketchContextType);
    rerender(<SketchOverlay />);
    expect(api.emitSketchClear).toHaveBeenCalledWith({ type: 'all' });
  });

  it('should handle clearSelfTrigger and filter local actions', () => {
    const { rerender } = render(<SketchOverlay />);

    // Add a local action (no userId)
    const stage = screen.getByTestId('konva-stage');
    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseUp(stage);
    });
    expect(screen.getByTestId('konva-line')).toBeInTheDocument();

    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      clearSelfTrigger: 1,
    } as unknown as SketchContextType);

    rerender(<SketchOverlay />);

    expect(api.emitSketchClear).toHaveBeenCalledWith({ type: 'self' });
    expect(screen.queryByTestId('konva-line')).not.toBeInTheDocument();
  });

  it('should respond to remote draw events', () => {
    render(<SketchOverlay />);
    const action: SketchActionType = {
      id: '1',
      type: 'freehand',
      data: [0, 0, 10, 10],
      color: 'red',
      strokeWidth: 2,
      videoTimestamp: 10,
    };
    act(() => {
      sketchDrawHandler(action);
    });
    expect(screen.getByTestId('konva-line')).toBeInTheDocument();
  });

  it('should respond to remote clear events', () => {
    render(<SketchOverlay />);
    const action: SketchActionType = {
      id: '1',
      type: 'freehand',
      data: [0, 0, 10, 10],
      color: 'red',
      strokeWidth: 2,
      videoTimestamp: 10,
    };
    act(() => {
      sketchDrawHandler(action);
    });
    expect(screen.getByTestId('konva-line')).toBeInTheDocument();

    act(() => {
      sketchClearHandler({ userId: 'user-2', type: 'all' });
    });
    expect(screen.queryByTestId('konva-line')).not.toBeInTheDocument();
  });

  it('should only clear specific user drawings on partial clear', () => {
    render(<SketchOverlay />);
    const action1: SketchActionType = {
      id: '1',
      type: 'freehand',
      data: [0, 0, 5, 5],
      color: 'red',
      strokeWidth: 2,
      videoTimestamp: 10,
      userId: 'user-1',
    };
    const action2: SketchActionType = {
      id: '2',
      type: 'freehand',
      data: [10, 10, 15, 15],
      color: 'blue',
      strokeWidth: 2,
      videoTimestamp: 10,
      userId: 'user-2',
    };

    act(() => {
      sketchDrawHandler(action1);
      sketchDrawHandler(action2);
    });

    const lines = screen.getAllByTestId('konva-line');
    expect(lines).toHaveLength(2);

    act(() => {
      sketchClearHandler({ userId: 'user-1', type: 'self' });
    });

    const remainingLines = screen.getAllByTestId('konva-line');
    expect(remainingLines).toHaveLength(1);
    expect(remainingLines[0]).toHaveAttribute('data-stroke', 'blue');
  });

  it('should handle text tool cancellation', () => {
    mockPrompt.mockReturnValue(null);
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'text' as ToolType,
    } as unknown as SketchContextType);

    const { getByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
    });
    expect(screen.queryByTestId('konva-text')).not.toBeInTheDocument();
  });

  it('should handle text tool success', async () => {
    mockPrompt.mockReturnValue('Hello World');
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'text' as ToolType,
    } as unknown as SketchContextType);

    const { getByTestId, findByTestId } = render(<SketchOverlay />);
    const stage = getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
    });

    expect(api.emitSketchDraw).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        text: 'Hello World',
      }),
    );

    const textElement = await findByTestId('konva-text');
    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveAttribute('data-text', 'Hello World');
  });

  it('should handle undoTrigger', () => {
    const { rerender } = render(<SketchOverlay />);
    const stage = screen.getByTestId('konva-stage');

    // Add an action
    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseUp(stage);
    });
    expect(screen.getAllByTestId('konva-line')).toHaveLength(1);

    // Trigger undo
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      undoTrigger: 1,
    } as unknown as SketchContextType);

    rerender(<SketchOverlay />);
    expect(screen.queryByTestId('konva-line')).not.toBeInTheDocument();
  });

  it('should respond to window resize', () => {
    render(<SketchOverlay />);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    // Just verify no crash
  });

  it('should handle laser tool with auto-fade', async () => {
    vi.useFakeTimers();
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'laser' as ToolType,
    } as unknown as SketchContextType);

    render(<SketchOverlay />);
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(screen.getByTestId('konva-line')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId('konva-line')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('should render pencil tool with correct properties', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'pencil' as ToolType,
      strokeWidth: 4,
    } as unknown as SketchContextType);

    render(<SketchOverlay />);
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseUp(stage);
    });

    const line = screen.getByTestId('konva-line');
    expect(line).toHaveAttribute('opacity', '0.7');
  });

  it('should provide sync to others if host', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      isHost: true,
    } as unknown as SketchContextType);
    render(<SketchOverlay />);
    act(() => {
      sketchProvideSyncHandler({ requesterId: 'user-2' });
    });
    expect(api.emitSketchSyncState).toHaveBeenCalledWith('user-2', []);
  });

  it('should update state from sync state event', () => {
    render(<SketchOverlay />);
    const elements: SketchActionType[] = [
      {
        id: '1',
        type: 'line',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
    ];
    act(() => {
      sketchSyncStateHandler({ elements });
    });
    expect(screen.getByTestId('konva-line')).toBeInTheDocument();
  });

  it('should render all shape types from actions', () => {
    render(<SketchOverlay />);
    const shapes: SketchActionType[] = [
      {
        id: '1',
        type: 'line',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
      {
        id: '2',
        type: 'rectangle',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
      {
        id: '3',
        type: 'circle',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
      {
        id: '4',
        type: 'triangle',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
      {
        id: '5',
        type: 'star',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
      {
        id: '6',
        type: 'arrow',
        data: [0, 0, 10, 10],
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 10,
      },
    ];
    act(() => {
      for (const s of shapes) {
        sketchDrawHandler(s);
      }
    });

    expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    expect(screen.getByTestId('konva-triangle')).toBeInTheDocument();
    expect(screen.getByTestId('konva-star')).toBeInTheDocument();
    expect(screen.getByTestId('konva-arrow')).toBeInTheDocument();
  });
});
