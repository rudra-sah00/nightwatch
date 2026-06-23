import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platforms/smart-tv/lib/detection', () => ({
  waitForTvFlag: vi.fn(),
}));

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { waitForTvFlag } from '@/platforms/smart-tv/lib/detection';

describe('TvPageGate', () => {
  it('shows skeleton initially', () => {
    vi.mocked(waitForTvFlag).mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <TvPageGate tvContent={<div>TV</div>}>
        <div>Web</div>
      </TvPageGate>,
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders tvContent when waitForTvFlag resolves true', async () => {
    vi.mocked(waitForTvFlag).mockResolvedValue(true);
    render(
      <TvPageGate tvContent={<div>TV Content</div>}>
        <div>Web Content</div>
      </TvPageGate>,
    );
    await waitFor(() => {
      expect(screen.getByText('TV Content')).toBeInTheDocument();
    });
  });

  it('renders children when waitForTvFlag resolves false', async () => {
    vi.mocked(waitForTvFlag).mockResolvedValue(false);
    render(
      <TvPageGate tvContent={<div>TV Content</div>}>
        <div>Web Content</div>
      </TvPageGate>,
    );
    await waitFor(() => {
      expect(screen.getByText('Web Content')).toBeInTheDocument();
    });
  });
});
