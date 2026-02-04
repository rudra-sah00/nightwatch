import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { StatsBanner } from '@/features/auth/components/stats-banner';

// Mock the API
vi.mock('@/features/auth/api', () => ({
  getPlatformStats: vi.fn(),
}));

describe('StatsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render loading skeleton initially', () => {
    vi.mocked(api.getPlatformStats).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<StatsBanner />);

    // Should show the loading skeleton (animate-pulse div)
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render stats after loading', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 36000,
      totalWatchTimeFormatted: '10h 0m',
      totalUsers: 150,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('10h 0m')).toBeInTheDocument();
    });

    expect(screen.getByText('150 users')).toBeInTheDocument();
    expect(screen.getByText('Content Streamed')).toBeInTheDocument();
    expect(screen.getByText('Live stats')).toBeInTheDocument();
  });

  it('should render loading skeleton when stats is null', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue(null);

    render(<StatsBanner />);

    await waitFor(() => {
      // Should still show skeleton after loading when stats is null
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  it('should format large user counts with locale string', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 360000,
      totalWatchTimeFormatted: '100h 0m',
      totalUsers: 1500,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('1,500 users')).toBeInTheDocument();
    });
  });

  it('should render animated elements', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 3600,
      totalWatchTimeFormatted: '1h 0m',
      totalUsers: 10,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });

    // Check for animated elements
    const scannerLine = document.querySelector('.animate-scan');
    expect(scannerLine).toBeInTheDocument();

    const floatingParticles = document.querySelectorAll('.animate-float');
    expect(floatingParticles.length).toBe(8);

    const marquee = document.querySelector('.animate-marquee');
    expect(marquee).toBeInTheDocument();

    const glowText = document.querySelector('.animate-glow');
    expect(glowText).toBeInTheDocument();
  });

  it('should render marquee with platform branding', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 3600,
      totalWatchTimeFormatted: '1h 0m',
      totalUsers: 10,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });

    // Check marquee content
    expect(screen.getAllByText('★ STREAMING PLATFORM').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('★ WATCH TOGETHER').length).toBeGreaterThan(0);
    expect(screen.getAllByText('★ HD QUALITY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('★ SYNC IN REAL-TIME').length).toBeGreaterThan(
      0,
    );
  });

  it('should render icons correctly', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 3600,
      totalWatchTimeFormatted: '1h 0m',
      totalUsers: 10,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });

    // Check for SVG icons (lucide-react renders as SVG)
    const svgIcons = document.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(3); // Play, Users, Clock icons
  });

  it('should call getPlatformStats on mount', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 3600,
      totalWatchTimeFormatted: '1h 0m',
      totalUsers: 10,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(api.getPlatformStats).toHaveBeenCalledTimes(1);
    });
  });

  it('should have live indicator with ping animation', async () => {
    vi.mocked(api.getPlatformStats).mockResolvedValue({
      totalWatchTimeSeconds: 3600,
      totalWatchTimeFormatted: '1h 0m',
      totalUsers: 10,
      lastUpdated: '2026-02-04T12:00:00.000Z',
    });

    render(<StatsBanner />);

    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });

    // Check for ping animation (live indicator)
    const pingAnimation = document.querySelector('.animate-ping');
    expect(pingAnimation).toBeInTheDocument();
  });
});
