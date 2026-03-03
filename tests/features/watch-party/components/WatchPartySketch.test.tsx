import { fireEvent, render, screen } from '@testing-library/react';
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
    videoRef: { current: null },
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
    const slider = screen.getByRole('slider');
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
});
