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
      expect(screen.getByText('Jan')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      const { container } = render(
        <ActivityGraph activity={[]} isLoading={true} />,
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders activity grid when data is provided', () => {
      const { container } = render(<ActivityGraph activity={mockActivity} />);
      // Should render the weeks grid cells
      const cells = container.querySelectorAll('.w-3.h-3');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('legend', () => {
    it('renders the months', () => {
      render(<ActivityGraph activity={mockActivity} />);
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Dec')).toBeInTheDocument();
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
      const cells = container.querySelectorAll('.w-3.h-3');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('renders correctly with empty activity array', () => {
      render(<ActivityGraph activity={[]} />);
      // Should show Jan/Dec
      expect(screen.getByText('Jan')).toBeInTheDocument();
    });
  });
});
