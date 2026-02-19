import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiLandingView } from '@/features/ai-assistant/components/AiLandingView';

// Mock icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Send: () => <div data-testid="send-icon" />,
}));

describe('AiLandingView', () => {
  const mockProps = {
    inputValue: '',
    setInputValue: vi.fn(),
    onSendMessage: vi.fn(),
    isLoading: false,
  };

  it('renders landing page with title and prompt cards', () => {
    render(<AiLandingView {...mockProps} />);

    expect(screen.getByText(/How can I help you today\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Suggest a sci-fi movie/i)).toBeInTheDocument();
    expect(screen.getByText(/Surprise me/i)).toBeInTheDocument();
  });

  it('calls onSendMessage when card is clicked', () => {
    const onSendMessage = vi.fn();
    render(<AiLandingView {...mockProps} onSendMessage={onSendMessage} />);

    const cards = screen.getAllByTestId('prompt-card');
    fireEvent.click(cards[0]);
    // The first prompt card has text: "Suggest a sci-fi movie"
    expect(onSendMessage).toHaveBeenCalledWith(
      undefined,
      'Suggest a sci-fi movie',
    );
  });

  it('calls onSendMessage when form is submitted', () => {
    const onSendMessage = vi
      .fn()
      .mockImplementation((e) => e?.preventDefault());
    render(
      <AiLandingView
        {...mockProps}
        inputValue="Inception"
        onSendMessage={onSendMessage}
      />,
    );

    const input = screen.getByPlaceholderText(/Message Watch Rudra AI/i);
    fireEvent.submit(input.closest('form')!);

    expect(onSendMessage).toHaveBeenCalled();
  });

  it('shows loading state on button when isLoading is true', () => {
    render(<AiLandingView {...mockProps} isLoading={true} inputValue="test" />);
    // The button is disabled when isLoading is true or inputValue is empty
    const button = screen.getByTestId('landing-send');
    expect(button).toBeDisabled();
  });
});
