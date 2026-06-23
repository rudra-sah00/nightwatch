import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBack = vi.fn();
const mockPathname = vi.fn(() => '/browse');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
  usePathname: () => mockPathname(),
}));

import { useTvBack } from '@/platforms/smart-tv/hooks/use-tv-back';

describe('useTvBack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls router.back() on Escape key when not on home', () => {
    mockPathname.mockReturnValue('/browse');
    renderHook(() => useTvBack());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not navigate on Escape when on home page', () => {
    mockPathname.mockReturnValue('/home');
    renderHook(() => useTvBack());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockBack).not.toHaveBeenCalled();
  });
});
