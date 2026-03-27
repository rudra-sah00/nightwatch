import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import { useSketch } from '@/features/watch-party/interactions/context/SketchContext';

// Mock react-konva
vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onMouseDown,
    onMousemove,
    onMouseup,
  }: {
    onMouseDown: (e?: unknown) => void;
    onMousemove: (e?: unknown) => void;
    onMouseup: (e?: unknown) => void;
    children: ReactNode;
  }) => (
    <canvas
      data-testid="konva-stage"
      onMouseDown={() =>
        onMouseDown({
          target: {
            getStage: () => ({ getPointerPosition: () => ({ x: 10, y: 10 }) }),
          },
        })
      }
      onMouseMove={() =>
        onMousemove({
          target: {
            getStage: () => ({ getPointerPosition: () => ({ x: 20, y: 20 }) }),
          },
        })
      }
      onMouseUp={
        onMouseup as unknown as React.MouseEventHandler<HTMLCanvasElement>
      }
    >
      {children}
    </canvas>
  ),
  Layer: ({ children }: { children: ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Line: (props: Record<string, unknown>) => (
    <div data-testid="konva-line" {...props} />
  ),
  Rect: (props: Record<string, unknown>) => (
    <div data-testid="konva-rect" {...props} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div data-testid="konva-circle" {...props} />
  ),
  Arrow: (props: Record<string, unknown>) => (
    <div data-testid="konva-arrow" {...props} />
  ),
  Text: (props: Record<string, unknown>) => (
    <div data-testid="konva-text" {...props} />
  ),
  RegularPolygon: (props: Record<string, unknown>) => (
    <div data-testid="konva-poly" {...props} />
  ),
  Group: ({ children }: { children: ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Label: ({
    children,
    x,
    y,
  }: {
    children: ReactNode;
    x?: number;
    y?: number;
  }) => (
    <div data-testid="konva-label" style={{ left: x, top: y }}>
      {children}
    </div>
  ),
  Tag: (props: Record<string, unknown>) => (
    <div data-testid="konva-tag" {...props} />
  ),
  Transformer: (props: Record<string, unknown>) => (
    <div data-testid="konva-transformer" {...props} />
  ),
  Star: (props: Record<string, unknown>) => (
    <div data-testid="konva-star" {...props} />
  ),
}));

// Mock useSketch
vi.mock('@/features/watch-party/interactions/context/SketchContext', () => ({
  useSketch: vi.fn(),
}));

describe('SketchOverlay', () => {
  const mockRtmSendMessage = vi.fn();
  const _mockRtmSendMessageToPeer = vi.fn();
  const mockContext = {
    currentTool: 'freehand',
    color: '#ff0000',
    strokeWidth: 4,
    clearTrigger: 0,
    clearSelfTrigger: 0,
    undoTrigger: 0,
    isSketchMode: true,
    canDraw: true,
    videoRef: { current: { currentTime: 10 } },
    isHost: false,
    actions: [],
    setActions: vi.fn(),
    cursors: {},
    setCursors: vi.fn(),
    selectedId: null,
    setSelectedId: vi.fn(),
    stageRef: { current: null },
    opacity: 1,
    isFilled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSketch).mockReturnValue(
      mockContext as unknown as import('@/features/watch-party/interactions/context/SketchContext').SketchContextType,
    );
  });

  it('renders stage when in sketch mode', () => {
    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
  });

  it('sends SKETCH_DRAW message on mouse up', async () => {
    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseMove(stage);
      fireEvent.mouseUp(stage);
    });

    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SKETCH_DRAW',
        action: expect.objectContaining({
          type: 'freehand',
          color: '#ff0000',
          userId: 'u1',
        }),
      }),
    );
  });

  it('requests sync on mount if not host', () => {
    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    expect(mockRtmSendMessage).toHaveBeenCalledWith({
      type: 'SKETCH_REQUEST_SYNC',
      requesterId: 'u1',
    });
  });

  it('handles text tool input and confirmation', async () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'text',
    } as unknown as import('@/features/watch-party/interactions/context/SketchContext').SketchContextType);
    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
    });

    const input = screen.getByPlaceholderText('Type text...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SKETCH_DRAW',
        action: expect.objectContaining({
          type: 'text',
          text: 'Hello',
        }),
      }),
    );
  });
});
