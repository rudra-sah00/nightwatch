import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiAssistantButton } from '@/features/ai-assistant/components/AiAssistantButton';

// Mock icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  MessageCircle: () => <div data-testid="message-icon" />,
  X: () => <div data-testid="close-icon" />,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe('AiAssistantButton', () => {
  it('renders correctly', () => {
    render(<AiAssistantButton onClick={vi.fn()} isOpen={false} />);
    expect(screen.getByLabelText('Open AI Assistant')).toBeInTheDocument();
    expect(screen.getByAltText('AI Assistant')).toBeInTheDocument();
  });

  it('transitions correctly when isOpen changes', () => {
    const { rerender } = render(
      <AiAssistantButton onClick={vi.fn()} isOpen={false} />,
    );
    expect(screen.getByAltText('AI Assistant')).toBeInTheDocument();
    expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument();

    rerender(<AiAssistantButton onClick={vi.fn()} isOpen={true} />);
    expect(screen.queryByAltText('AI Assistant')).not.toBeInTheDocument();
    expect(screen.getByTestId('close-icon')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AiAssistantButton onClick={onClick} isOpen={false} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows AI image initially', () => {
    render(<AiAssistantButton onClick={vi.fn()} isOpen={false} />);
    expect(screen.getByAltText('AI Assistant')).toBeInTheDocument();
  });
});
