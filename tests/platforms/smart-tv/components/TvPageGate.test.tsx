import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platforms/smart-tv/lib/detection', () => ({
  isTV: vi.fn(),
  waitForTvFlag: vi.fn(),
}));

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { isTV, waitForTvFlag } from '@/platforms/smart-tv/lib/detection';

describe('TvPageGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTV).mockReturnValue(false);
  });

  it('renders web children immediately without a skeleton while detecting', () => {
    // Detection never settles — the web tree must still be visible.
    vi.mocked(waitForTvFlag).mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <TvPageGate tvContent={<div>TV</div>}>
        <div>Web</div>
      </TvPageGate>,
    );
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    expect(screen.queryByText('TV')).not.toBeInTheDocument();
  });

  it('renders tvContent without waiting when isTV() is synchronously true', async () => {
    vi.mocked(isTV).mockReturnValue(true);
    // Would never settle — proves the sync path is what swaps in the TV tree.
    vi.mocked(waitForTvFlag).mockReturnValue(new Promise(() => {}));
    render(
      <TvPageGate tvContent={<div>TV Content</div>}>
        <div>Web Content</div>
      </TvPageGate>,
    );
    await waitFor(() => {
      expect(screen.getByText('TV Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Web Content')).not.toBeInTheDocument();
    expect(waitForTvFlag).not.toHaveBeenCalled();
  });

  it('upgrades to tvContent when waitForTvFlag resolves true', async () => {
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

  it('keeps rendering children when waitForTvFlag resolves false', async () => {
    vi.mocked(waitForTvFlag).mockResolvedValue(false);
    render(
      <TvPageGate tvContent={<div>TV Content</div>}>
        <div>Web Content</div>
      </TvPageGate>,
    );
    await waitFor(() => {
      expect(screen.getByText('Web Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('TV Content')).not.toBeInTheDocument();
  });
});
