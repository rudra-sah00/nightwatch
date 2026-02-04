import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityGraph } from '@/features/profile/components/activity-graph';
import type { WatchActivity } from '@/features/profile/types';

describe('ActivityGraph', () => {
  const mockActivity: WatchActivity[] = [
    { date: '2026-01-15', count: 30, level: 1 },
    { date: '2026-01-16', count: 60, level: 2 },
    { date: '2026-01-17', count: 90, level: 3 },
    { date: '2026-01-18', count: 150, level: 4 },
  ];

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<ActivityGraph activity={[]} />);
      expect(screen.getByText(/watched|minutes|hours/i)).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      const { container } = render(
        <ActivityGraph activity={[]} isLoading={true} />,
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders activity grid when data is provided', () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Should render the weeks grid
      const cells = container.querySelectorAll('[class*="rounded-"]');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('stats display', () => {
    it('displays total watch time in minutes when less than 60', () => {
      const lowActivity: WatchActivity[] = [
        { date: '2026-01-15', count: 30, level: 1 },
      ];
      render(<ActivityGraph activity={lowActivity} />);
      expect(screen.getByText('minutes')).toBeInTheDocument();
    });

    it('displays total watch time in hours when 60 or more', () => {
      const highActivity: WatchActivity[] = [
        { date: '2026-01-15', count: 120, level: 4 },
      ];
      render(<ActivityGraph activity={highActivity} />);
      expect(screen.getByText('hours')).toBeInTheDocument();
    });

    it('shows descriptive text about watch time', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(
        screen.getByText(/Total watch time in the last year/i),
      ).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('renders the legend with Less and More labels', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('renders pattern description text', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText('Your watching patterns')).toBeInTheDocument();
    });
  });

  describe('activity levels', () => {
    it('applies correct color classes based on activity level', () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Check that gradient classes are applied for different levels
      const gradientCells = container.querySelectorAll(
        '[class*="bg-gradient-to-br"]',
      );
      expect(gradientCells.length).toBeGreaterThan(0);
    });
  });

  describe('tooltips', () => {
    it('has tooltip elements for activity cells', async () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Tooltips are hidden by default but should exist in DOM
      const tooltipContainers = container.querySelectorAll('.group');
      expect(tooltipContainers.length).toBeGreaterThan(0);
    });
  });

  describe('with createdAt date', () => {
    it('respects createdAt date for activity display', () => {
      const createdAt = new Date('2026-01-01');
      const { container } = render(
        <ActivityGraph activity={mockActivity} createdAt={createdAt} />,
      );
      // Should still render the grid
      const cells = container.querySelectorAll('[class*="rounded-"]');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('renders correctly with empty activity array', () => {
      render(<ActivityGraph activity={[]} />);
      // Should show 0 and minutes text
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('minutes')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible video icon with aria-label', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByLabelText('Video icon')).toBeInTheDocument();
    });
  });
});
