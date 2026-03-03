import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantWidget } from '@/features/ai-assistant/AiAssistantWidget';
import { type AuthContextType, useAuth } from '@/providers/auth-provider';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/ai-assistant/components/AiAssistantButton', () => ({
  AiAssistantButton: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="ai-assistant-button" onClick={onClick}>
      AI Button
    </button>
  ),
}));

describe('AiAssistantWidget', () => {
  const mockPush = vi.fn();
  const mockUser = {
    preferredServer: 's1',
    id: '1',
    name: 'Rudra',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue('/home');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
    } as unknown as AuthContextType);
  });

  it('renders button when user is logged in and not on ai-assistant page', () => {
    render(<AiAssistantWidget />);
    expect(screen.getByTestId('ai-assistant-button')).toBeInTheDocument();
  });

  it('does not render when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
    } as unknown as AuthContextType);
    render(<AiAssistantWidget />);
    expect(screen.queryByTestId('ai-assistant-button')).not.toBeInTheDocument();
  });

  it('does not render when on /ai-assistant page', () => {
    vi.mocked(usePathname).mockReturnValue('/ai-assistant');
    render(<AiAssistantWidget />);
    expect(screen.queryByTestId('ai-assistant-button')).not.toBeInTheDocument();
  });

  it('navigates to /ai-assistant when clicked', () => {
    render(<AiAssistantWidget />);
    fireEvent.click(screen.getByTestId('ai-assistant-button'));
    expect(mockPush).toHaveBeenCalledWith('/ai-assistant');
  });
});
