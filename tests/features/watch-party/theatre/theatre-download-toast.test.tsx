import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ProgressRing,
  TheatreDownloadCard,
} from '@/features/watch-party/theatre/components/TheatreDownloadToast';
import { useTheatreView } from '@/features/watch-party/theatre/lib/view-mode';

/** Put the store in a known download state. */
function setDownloading(
  received: number,
  total: number,
  extra: Partial<{
    filesDone: number;
    fileCount: number;
    attempt: number;
  }> = {},
) {
  const s = useTheatreView.getState();
  s.setPhase('downloading');
  s.setDownload({
    progress: total > 0 ? received / total : 0,
    receivedBytes: received,
    totalBytes: total,
    filesDone: extra.filesDone ?? 0,
    fileCount: extra.fileCount ?? 5,
  });
  if (extra.attempt) s.setAttempt(extra.attempt);
}

const MB = 1024 * 1024;

beforeEach(() => {
  const s = useTheatreView.getState();
  s.disable();
  s.setAttempt(1);
});

describe('ProgressRing', () => {
  it('exposes the percentage to assistive technology', () => {
    render(<ProgressRing fraction={0.42} label="42%" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows the rounded percentage as text', () => {
    render(<ProgressRing fraction={0.666} label="67%" />);
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('clamps out-of-range and non-finite fractions', () => {
    const { rerender } = render(<ProgressRing fraction={1.8} label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );

    rerender(<ProgressRing fraction={-3} label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );

    rerender(<ProgressRing fraction={Number.NaN} label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('reports no percentage while indeterminate rather than a misleading zero', () => {
    render(<ProgressRing fraction={0} label="Starting" indeterminate />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('draws a shorter arc as progress grows', () => {
    const offsetOf = (container: HTMLElement) => {
      const circles = container.querySelectorAll('circle');
      return Number(
        circles[circles.length - 1].getAttribute('stroke-dashoffset'),
      );
    };

    const quarter = render(<ProgressRing fraction={0.25} label="a" />);
    const threeQuarters = render(<ProgressRing fraction={0.75} label="b" />);

    expect(offsetOf(threeQuarters.container)).toBeLessThan(
      offsetOf(quarter.container),
    );
  });
});

describe('TheatreDownloadCard', () => {
  it('shows megabytes downloaded against the total', () => {
    setDownloading(12.4 * MB, 38.1 * MB);
    render(<TheatreDownloadCard />);
    expect(screen.getByText('12.4 MB / 38.1 MB')).toBeInTheDocument();
  });

  it('shows the percentage on the ring', () => {
    setDownloading(19 * MB, 38 * MB);
    render(<TheatreDownloadCard />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('omits the total until sizes are known', () => {
    setDownloading(2 * MB, 0);
    render(<TheatreDownloadCard />);
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it('counts files so a stalled byte counter still shows movement', () => {
    setDownloading(5 * MB, 38 * MB, { filesDone: 3, fileCount: 5 });
    render(<TheatreDownloadCard />);
    expect(screen.getByText('3 of 5 files')).toBeInTheDocument();
  });

  it('says it is reconnecting during backoff, when no bytes are moving', () => {
    setDownloading(5 * MB, 38 * MB, { attempt: 3 });
    render(<TheatreDownloadCard />);
    expect(screen.getByText('Reconnecting — attempt 3')).toBeInTheDocument();
  });

  it('offers no dismiss control while downloading, so it cannot be closed early', () => {
    setDownloading(5 * MB, 38 * MB);
    render(<TheatreDownloadCard />);
    expect(
      screen.queryByRole('button', { name: /retry/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancel/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the failure reason and a retry button on error', () => {
    setDownloading(5 * MB, 38 * MB);
    useTheatreView.getState().fail('Network unavailable');
    render(<TheatreDownloadCard />);

    expect(screen.getByText('Download failed')).toBeInTheDocument();
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retrying clears the error and returns to downloading', async () => {
    setDownloading(5 * MB, 38 * MB);
    useTheatreView.getState().fail('Network unavailable');
    render(<TheatreDownloadCard />);

    const before = useTheatreView.getState().retryNonce;
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    const after = useTheatreView.getState();
    expect(after.phase).toBe('downloading');
    expect(after.error).toBeNull();
    expect(after.retryNonce).toBe(before + 1);
  });

  it('retrying keeps the bytes already downloaded rather than resetting the bar', async () => {
    setDownloading(30 * MB, 38 * MB);
    useTheatreView.getState().fail('Network unavailable');
    render(<TheatreDownloadCard />);

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(useTheatreView.getState().receivedBytes).toBe(30 * MB);
  });

  it('cancelling turns the theatre off entirely', async () => {
    setDownloading(5 * MB, 38 * MB);
    useTheatreView.getState().fail('Network unavailable');
    render(<TheatreDownloadCard />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    const after = useTheatreView.getState();
    expect(after.enabled).toBe(false);
    expect(after.phase).toBe('idle');
    expect(after.receivedBytes).toBe(0);
  });

  it('announces politely so it does not interrupt a screen reader each update', () => {
    setDownloading(5 * MB, 38 * MB);
    render(<TheatreDownloadCard />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
