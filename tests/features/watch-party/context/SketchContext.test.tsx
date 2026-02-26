import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  SketchProvider,
  useSketch,
} from '@/features/watch-party/context/SketchContext';

const TestComponent = () => {
  const {
    currentTool,
    setCurrentTool,
    color,
    setColor,
    clearTrigger,
    triggerClear,
    isSketchMode,
    setIsSketchMode,
    canDraw,
    setCanDraw,
  } = useSketch();

  return (
    <div>
      <span data-testid="tool">{currentTool}</span>
      <span data-testid="color">{color}</span>
      <span data-testid="clear-trigger">{clearTrigger}</span>
      <span data-testid="sketch-mode">
        {isSketchMode ? 'active' : 'inactive'}
      </span>
      <span data-testid="can-draw">{canDraw ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => setCurrentTool('pencil')}>
        Set Pencil
      </button>
      <button type="button" onClick={() => setColor('#000000')}>
        Set Black
      </button>
      <button type="button" onClick={triggerClear}>
        Clear
      </button>
      <button type="button" onClick={() => setIsSketchMode(true)}>
        Activate
      </button>
      <button type="button" onClick={() => setCanDraw(true)}>
        Enable Draw
      </button>
    </div>
  );
};

describe('SketchContext', () => {
  it('should provide default values', () => {
    render(
      <SketchProvider>
        <TestComponent />
      </SketchProvider>,
    );

    expect(screen.getByTestId('tool').textContent).toBe('freehand');
    expect(screen.getByTestId('color').textContent).toBe('#ef4444');
    expect(screen.getByTestId('clear-trigger').textContent).toBe('0');
    expect(screen.getByTestId('sketch-mode').textContent).toBe('inactive');
    expect(screen.getByTestId('can-draw').textContent).toBe('no');
  });

  it('should update tool and color', () => {
    render(
      <SketchProvider>
        <TestComponent />
      </SketchProvider>,
    );

    act(() => {
      screen.getByText('Set Pencil').click();
      screen.getByText('Set Black').click();
    });

    expect(screen.getByTestId('tool').textContent).toBe('pencil');
    expect(screen.getByTestId('color').textContent).toBe('#000000');
  });

  it('should increment clear trigger', () => {
    render(
      <SketchProvider>
        <TestComponent />
      </SketchProvider>,
    );

    act(() => {
      screen.getByText('Clear').click();
    });
    expect(screen.getByTestId('clear-trigger').textContent).toBe('1');

    act(() => {
      screen.getByText('Clear').click();
    });
    expect(screen.getByTestId('clear-trigger').textContent).toBe('2');
  });

  it('should toggle sketch mode and draw permission', () => {
    render(
      <SketchProvider>
        <TestComponent />
      </SketchProvider>,
    );

    act(() => {
      screen.getByText('Activate').click();
      screen.getByText('Enable Draw').click();
    });

    expect(screen.getByTestId('sketch-mode').textContent).toBe('active');
    expect(screen.getByTestId('can-draw').textContent).toBe('yes');
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useSketch must be used within a SketchProvider',
    );
    consoleSpy.mockRestore();
  });
});
