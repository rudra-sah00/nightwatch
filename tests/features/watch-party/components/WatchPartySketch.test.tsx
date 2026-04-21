import { fireEvent, render, screen } from '@testing-library/react';
import type Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WatchPartySketch,
  WatchPartySketchDisabled,
} from '@/features/watch-party/interactions/components/WatchPartySketch';
import {
  type SketchContextType,
  type ToolType,
  useSketch,
} from '@/features/watch-party/interactions/context/SketchContext';

// Mock useSketch to track calls
vi.mock(
  '@/features/watch-party/interactions/context/SketchContext',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/watch-party/interactions/context/SketchContext')
      >();
    return {
      ...actual,
      useSketch: vi.fn(),
    };
  },
);

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    ArrowUpRight: () => <div data-testid="ArrowUpRight" />,
    Camera: () => <div data-testid="Camera" />,
    Circle: () => <div data-testid="Circle" />,
    Eraser: () => <div data-testid="Eraser" />,
    MessageSquare: () => <div data-testid="MessageSquare" />,
    Minus: () => <div data-testid="Minus" />,
    MousePointer2: () => <div data-testid="MousePointer2" />,
    MoveDown: () => <div data-testid="MoveDown" />,
    MoveUp: () => <div data-testid="MoveUp" />,
    Pencil: () => <div data-testid="Pencil" />,
    PenTool: () => <div data-testid="PenTool" />,
    Pipette: () => <div data-testid="Pipette" />,
    Sparkles: () => <div data-testid="Sparkles" />,
    Square: () => <div data-testid="Square" />,
    Star: () => <div data-testid="Star" />,
    Trash2: () => <div data-testid="Trash2" />,
    Triangle: () => <div data-testid="Triangle" />,
    Type: () => <div data-testid="Type" />,
    Undo2: () => <div data-testid="Undo2" />,
    Zap: () => <div data-testid="Zap" />,
  };
});

vi.mock('@/features/watch-party/interactions/hooks/use-sketch-overlay', () => ({
  useSketchOverlay: vi.fn().mockReturnValue({
    handleMoveZ: vi.fn(),
  }),
}));

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="emoji-picker" />,
  Theme: { LIGHT: 'light', DARK: 'dark' },
  EmojiStyle: { NATIVE: 'native', APPLE: 'apple', TWITTER: 'twitter' },
}));

describe('WatchPartySketch', () => {
  const mockContext: SketchContextType = {
    currentTool: 'freehand' as ToolType,
    setCurrentTool: vi.fn(),
    color: '#ef4444',
    setColor: vi.fn(),
    strokeWidth: 4,
    setStrokeWidth: vi.fn(),
    clearTrigger: 0,
    triggerClear: vi.fn(),
    clearSelfTrigger: 0,
    triggerClearSelf: vi.fn(),
    undoTrigger: 0,
    triggerUndo: vi.fn(),
    isSketchMode: true,
    setIsSketchMode: vi.fn(),
    canDraw: true,
    setCanDraw: vi.fn(),
    isHost: true,
    setIsHost: vi.fn(),
    isFilled: false,
    setIsFilled: vi.fn(),
    opacity: 1,
    setOpacity: vi.fn(),
    actions: [],
    setActions: vi.fn(),
    selectedId: null,
    setSelectedId: vi.fn(),
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
    selectedSticker: null,
    setSelectedSticker: vi.fn(),
    videoRef: { current: null },
    stageRef: { current: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSketch).mockReturnValue(mockContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render all tools', () => {
    render(<WatchPartySketch />);
    expect(screen.getByTitle('sketch.toolPen')).toBeInTheDocument();
    expect(screen.getByTitle('sketch.toolPencil')).toBeInTheDocument();
    expect(screen.getByTitle('sketch.toolEraser')).toBeInTheDocument();
    expect(screen.getByTitle('sketch.toolBox')).toBeInTheDocument();
  });

  it('should change tool when clicked', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByTitle('sketch.toolPencil'));
    expect(mockContext.setCurrentTool).toHaveBeenCalledWith('pencil');
  });

  it('should change color when clicked', () => {
    render(<WatchPartySketch />);
    const colorBtn = screen.getAllByLabelText(/sketch\.selectColor/)[0];
    fireEvent.click(colorBtn);
    expect(mockContext.setColor).toHaveBeenCalledWith('#ef4444');
  });

  it('should toggle fill when clicked', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'rectangle' as ToolType,
    });
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByText('sketch.outlineOnly'));
    expect(mockContext.setIsFilled).toHaveBeenCalledWith(true);
  });

  it('should handle custom color change', () => {
    render(<WatchPartySketch />);
    const customBtn = screen.getByTitle('sketch.customColor');
    const input = customBtn.querySelector('input')!;
    fireEvent.change(input, { target: { value: '#0000ff' } });
    expect(mockContext.setColor).toHaveBeenCalledWith('#0000ff');
  });

  it('should handle stroke width change', () => {
    render(<WatchPartySketch />);
    const slider = screen.getByLabelText('sketch.thickness');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(mockContext.setStrokeWidth).toHaveBeenCalledWith(10);
  });

  it('should toggle sketch mode and show disabled message', () => {
    render(<WatchPartySketchDisabled />);
    expect(screen.getByText('sketch.disabled')).toBeInTheDocument();
  });

  it('should trigger clear and undo', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByTitle('sketch.undoTitle'));
    expect(mockContext.triggerUndo).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('sketch.clearMineTitle'));
    expect(mockContext.triggerClearSelf).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('sketch.clearAllTitle'));
    expect(mockContext.triggerClear).toHaveBeenCalled();
  });

  it('should show opacity slider and handle change', () => {
    render(<WatchPartySketch />);
    const slider = screen.getByLabelText('sketch.opacity');
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(mockContext.setOpacity).toHaveBeenCalledWith(0.5);
  });

  it('should show sticker selection and pick emoji', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByTitle('sketch.toolReaction'));
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('should trigger scene capture', () => {
    const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,123');
    const mockStage = {
      toDataURL: mockToDataURL,
      findOne: vi.fn(),
      batchDraw: vi.fn(),
    };
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      stageRef: { current: mockStage as unknown as Konva.Stage },
    });
    render(<WatchPartySketch />);

    // Mock anchor element and its click
    const link = { click: vi.fn(), download: '', href: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(
      link as unknown as ReturnType<typeof document.createElement>,
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByText('sketch.captureScene'));
    vi.advanceTimersByTime(100);
    vi.useRealTimers();

    expect(mockToDataURL).toHaveBeenCalled();
    expect(link.download).toContain('watch-party-sketch-');
  });

  it('should show move Z buttons when element is selected', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'rectangle' as ToolType,
      selectedId: 'rect1',
    });
    render(<WatchPartySketch />);
    expect(screen.getByTitle('sketch.bringToFront')).toBeInTheDocument();
    expect(screen.getByTitle('sketch.sendToBack')).toBeInTheDocument();
  });
});
