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
      expect(screen.getByText(/minutes|hours/i)).toBeInTheDocument();
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
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument();
    });

    it('displays total watch time in hours when 60 or more', () => {
      const highActivity: WatchActivity[] = [
        { date: '2026-01-15', count: 120, level: 4 },
      ];
      render(<ActivityGraph activity={highActivity} />);
      expect(screen.getByText(/2 hours/i)).toBeInTheDocument();
    });

    it('shows descriptive text about watch time', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText(/in the last year/i)).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('renders the legend with Less and More labels', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('renders day labels for GitHub-style graph', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
    });
  });

  describe('activity levels', () => {
    it('applies correct color classes based on activity level', () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Check that red color classes are applied for different levels
      const redCells = container.querySelectorAll('[class*="bg-red-"]');
      expect(redCells.length).toBeGreaterThan(0);
    });
  });

  describe('tooltips', () => {
    it('has tooltip elements for activity cells', async () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Tooltips are hidden by default but should exist in DOM (using group/cell now)
      const tooltipContainers = container.querySelectorAll(
        '[class*="group/cell"]',
      );
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
      expect(screen.getByText('0 minutes')).toBeInTheDocument();
    });
  });
});
