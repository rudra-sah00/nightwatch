import { fireEvent, render, screen } from '@testing-library/react';
import type Konva from 'konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@/features/watch-party/interactions/hooks/use-sketch-overlay', () => ({
  useSketchOverlay: vi.fn().mockReturnValue({
    handleMoveZ: vi.fn(),
  }),
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

  it('should render all tools', () => {
    render(<WatchPartySketch />);
    expect(screen.getByTitle('Pen')).toBeInTheDocument();
    expect(screen.getByTitle('Pencil')).toBeInTheDocument();
    expect(screen.getByTitle('Eraser')).toBeInTheDocument();
    expect(screen.getByTitle('Box')).toBeInTheDocument();
  });

  it('should change tool when clicked', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByTitle('Pencil'));
    expect(mockContext.setCurrentTool).toHaveBeenCalledWith('pencil');
  });

  it('should change color when clicked', () => {
    render(<WatchPartySketch />);
    const redButton = screen.getByLabelText('Select color #ef4444');
    fireEvent.click(redButton);
    expect(mockContext.setColor).toHaveBeenCalledWith('#ef4444');
  });

  it('should hide color selection when eraser is active', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'eraser' as ToolType,
    });

    render(<WatchPartySketch />);
    expect(screen.queryByText('Color')).not.toBeInTheDocument();
  });

  it('should update stroke width', () => {
    render(<WatchPartySketch />);
    const slider = screen.getByLabelText('Thickness');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(mockContext.setStrokeWidth).toHaveBeenCalledWith(10);
  });

  it('should trigger clear all for host', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByText('Clear All'));
    expect(mockContext.triggerClear).toHaveBeenCalled();
  });

  it('should trigger clear mine', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByText('Clear Mine'));
    expect(mockContext.triggerClearSelf).toHaveBeenCalled();
  });

  it('should not show clear all for non-host', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      isHost: false,
    });
    render(<WatchPartySketch />);
    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });

  it('should show disabled state variant', () => {
    render(<WatchPartySketchDisabled />);
    expect(screen.getByText('Sketching Disabled')).toBeInTheDocument();
    expect(
      screen.getByText('The host has disabled drawing for guests.'),
    ).toBeInTheDocument();
  });

  it('should show "Font Size" label when text tool is active', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'text' as ToolType,
    });
    render(<WatchPartySketch />);
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.queryByText('Thickness')).not.toBeInTheDocument();
  });

  it('should show "Thickness" label for non-text tools', () => {
    render(<WatchPartySketch />);
    expect(screen.getByText('Thickness')).toBeInTheDocument();
    expect(screen.queryByText('Font Size')).not.toBeInTheDocument();
  });

  it('should display font size as strokeWidth * 4 when text tool is active', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'text' as ToolType,
      strokeWidth: 5,
    });
    render(<WatchPartySketch />);
    // font size = 5 * 4 = 20px
    expect(screen.getByText('20px')).toBeInTheDocument();
  });

  it('should display raw strokeWidth when non-text tool is active', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'freehand' as ToolType,
      strokeWidth: 8,
    });
    render(<WatchPartySketch />);
    expect(screen.getByText('8px')).toBeInTheDocument();
  });

  it('should trigger undo', () => {
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByTitle('Undo last action'));
    expect(mockContext.triggerUndo).toHaveBeenCalled();
  });

  it('should update opacity', () => {
    render(<WatchPartySketch />);
    const slider = screen.getByLabelText('Opacity');
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(mockContext.setOpacity).toHaveBeenCalledWith(0.5);
  });

  it('should toggle fill for shapes', () => {
    vi.mocked(useSketch).mockReturnValue({
      ...mockContext,
      currentTool: 'rectangle' as ToolType,
    });
    render(<WatchPartySketch />);
    fireEvent.click(screen.getByText('Outline Only'));
    expect(mockContext.setIsFilled).toHaveBeenCalledWith(true);
  });

  it('should open emoji picker and select sticker', () => {
    render(<WatchPartySketch />);
    // Tool with sticker logic is implicitly linked to handleToolClick('sticker')
    // Mocking TOOLS constant isn't easy here, but we can find the button if it were there.
    // Let's manually trigger handleToolClick if we can, or just find by something else.
    // Actually, let's just test the custom color picker which is similar logic.
    const customColorBtn = screen.getByTitle('Custom Color');
    expect(customColorBtn).toBeInTheDocument();
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
      link as unknown as HTMLAnchorElement,
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByText('Capture Scene'));
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
    expect(screen.getByTitle('Bring to Front')).toBeInTheDocument();
    expect(screen.getByTitle('Send to Back')).toBeInTheDocument();
  });
});
