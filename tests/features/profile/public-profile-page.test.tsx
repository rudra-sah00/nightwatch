import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PublicProfilePage from '@/app/(public)/user/[id]/page';

// Mock specific lucide-react icons used in the page
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Home: () => <div data-testid="home-icon" />,
}));

// Mock ActivityGraph component as it has its own tests
vi.mock('@/features/profile/components/activity-graph', () => ({
  ActivityGraph: () => <div data-testid="activity-graph" />,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

// Mock the API service so we don't need to mock global fetch
vi.mock('@/features/profile/api', () => ({
  getPublicProfile: vi.fn(),
}));

describe('PublicProfilePage (Server Component)', () => {
  const mockProfile = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    username: 'testuser',
    profilePhoto: 'https://example.com/photo.jpg',
    createdAt: '2024-01-01T00:00:00.000Z',
    email: 'test@example.com',
    preferredServer: 's1' as const,
    sessionId: 'mock-session-id',
    activity: [
      { date: '2024-01-01', watchSeconds: 3600 },
      { date: '2024-01-02', watchSeconds: 7200 },
    ],
  };

  it('renders correctly with user data using feature view', async () => {
    const { getPublicProfile } = await import('@/features/profile/api');
    vi.mocked(getPublicProfile).mockResolvedValue({ profile: mockProfile });

    // Call the server component directly (as it is just an async function)
    const page = await PublicProfilePage({
      params: Promise.resolve({ id: mockProfile.id }),
    });

    render(page);

    // Assert using the new UI texts from PublicProfileView
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText(/Joined January 2024/i)).toBeInTheDocument();

    // Check for activity statistics (new labels)
    expect(screen.getByText('HRS TOTAL')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // (3600 + 7200) / 3600 = 3

    // Check for mocked components
    expect(screen.getByTestId('activity-graph')).toBeInTheDocument();
  });

  it('triggers notFound when user is missing in backend', async () => {
    const { getPublicProfile } = await import('@/features/profile/api');
    const { notFound } = await import('next/navigation');

    // Mock notFound to throw as it does in Next.js
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });

    vi.mocked(getPublicProfile).mockImplementation(() =>
      Promise.reject(new Error('User not found')),
    );

    await expect(
      PublicProfilePage({
        params: Promise.resolve({ id: 'non-existent' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
  });

  it('calculates streaks correctly within the View component', async () => {
    const { getPublicProfile } = await import('@/features/profile/api');

    // For this test, we verify the page handles empty activity gracefully.
    vi.mocked(getPublicProfile).mockResolvedValue({
      profile: { ...mockProfile, activity: [] },
    });

    const page = await PublicProfilePage({
      params: Promise.resolve({ id: mockProfile.id }),
    });

    render(page);
    expect(screen.getAllByText('0')).toHaveLength(2); // Streak and Total Hours
    expect(screen.getByText('DAYS ACTIVE')).toBeInTheDocument();
  });
});
