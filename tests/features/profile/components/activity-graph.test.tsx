import { render } from '@testing-library/react';
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
      // Month labels are now dynamic based on the 53-week range ending today
      const monthContainer = document.querySelector(
        '.flex.justify-between.mt-4',
      );
      expect(monthContainer).toBeInTheDocument();
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
    it('renders dynamic month labels matching the date range', () => {
      render(<ActivityGraph activity={mockActivity} />);
      // The graph covers ~53 weeks ending today, so it should show
      // roughly 12-13 month labels spanning that range, not a fixed Jan-Dec
      const monthContainer = document.querySelector(
        '.flex.justify-between.mt-4',
      );
      expect(monthContainer).toBeInTheDocument();
      const spans = monthContainer!.querySelectorAll('span');
      expect(spans.length).toBeGreaterThanOrEqual(12);
      expect(spans.length).toBeLessThanOrEqual(14);
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
      // Should show dynamic month labels
      const monthContainer = document.querySelector(
        '.flex.justify-between.mt-4',
      );
      expect(monthContainer).toBeInTheDocument();
    });
  });
});
