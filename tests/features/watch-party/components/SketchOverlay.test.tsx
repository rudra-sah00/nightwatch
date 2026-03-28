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
  Text: (
    props: { text?: string; children?: ReactNode } & Record<string, unknown>,
  ) => (
    <div data-testid="konva-text" {...props}>
      {props.text}
      {props.children}
    </div>
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
    cursors: {} as Record<
      string,
      {
        x: number;
        y: number;
        userName: string;
        color: string;
        lastUpdate: number;
      }
    >,
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

  it('cancels text input on Escape', async () => {
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
    fireEvent.change(input, { target: { value: 'Cancel me' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockRtmSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SKETCH_DRAW',
      }),
    );
  });

  it('renders participant cursors', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      cursors: {
        u2: {
          x: 50,
          y: 50,
          userName: 'Alice',
          color: '#00ff00',
          lastUpdate: Date.now(),
        },
      },
    } as unknown as import('@/features/watch-party/interactions/context/SketchContext').SketchContextType);

    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('does not send DRAW message if canDraw is false', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      canDraw: false,
    } as unknown as import('@/features/watch-party/interactions/context/SketchContext').SketchContextType);

    render(<SketchOverlay rtmSendMessage={mockRtmSendMessage} userId="u1" />);
    const stage = screen.getByTestId('konva-stage');

    act(() => {
      fireEvent.mouseDown(stage);
      fireEvent.mouseUp(stage);
    });

    // The SKETCH_REQUEST_SYNC might still be called, but SKETCH_DRAW shouldn't be.
    const drawCalls = mockRtmSendMessage.mock.calls.filter(
      (call) => call[0].type === 'SKETCH_DRAW',
    );
    expect(drawCalls.length).toBe(0);
  });
});
