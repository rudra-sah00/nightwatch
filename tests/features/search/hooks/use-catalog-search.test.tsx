import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogSearch } from '@/features/search/hooks/use-catalog-search';
import type { SearchResult } from '@/features/search/types';

const { mockSearchCatalogContent } = vi.hoisted(() => ({
  mockSearchCatalogContent: vi.fn(),
}));

vi.mock('@/features/search/api', () => ({
  searchCatalogContent: mockSearchCatalogContent,
}));

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

const row = (id: string) => ({ id, title: id }) as unknown as SearchResult;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCatalogSearch', () => {
  it('requests every catalogue separately', async () => {
    mockSearchCatalogContent.mockResolvedValue([]);

    renderHook(() => useCatalogSearch('ted'), { wrapper });

    await waitFor(() =>
      expect(mockSearchCatalogContent).toHaveBeenCalledTimes(3),
    );
    expect(mockSearchCatalogContent.mock.calls.map((c) => c[0])).toEqual([
      'nf',
      'pv',
      'hs',
    ]);
  });

  it('issues no request for a blank query', () => {
    renderHook(() => useCatalogSearch('   '), { wrapper });

    expect(mockSearchCatalogContent).not.toHaveBeenCalled();
  });

  /**
   * The point of the split: a catalogue that has answered is usable immediately, while the
   * slow one is still pending. The merged endpoint could only ever report both at once.
   */
  it('exposes a resolved catalogue while another is still pending', async () => {
    let releasePv: ((value: SearchResult[]) => void) | undefined;
    mockSearchCatalogContent.mockImplementation((catalog: string) =>
      catalog === 'pv'
        ? new Promise<SearchResult[]>((resolve) => {
            releasePv = resolve;
          })
        : Promise.resolve([row(`${catalog}-1`)]),
    );

    const { result } = renderHook(() => useCatalogSearch('ted'), { wrapper });

    await waitFor(() => {
      const nf = result.current.sections.find((s) => s.id === 'nf');
      expect(nf?.isPending).toBe(false);
      expect(nf?.results).toHaveLength(1);
    });

    const pv = result.current.sections.find((s) => s.id === 'pv');
    expect(pv?.isPending).toBe(true);
    expect(result.current.isAnyPending).toBe(true);
    expect(result.current.isSettled).toBe(false);
    // Only the catalogues that landed are counted, so the total climbs as they arrive.
    expect(result.current.totalCount).toBe(2);

    releasePv?.([row('pv-1')]);

    await waitFor(() => expect(result.current.isSettled).toBe(true));
    expect(result.current.totalCount).toBe(3);
  });

  /** One dead catalogue must not fail the search, only its own section. */
  it('isolates a failing catalogue from the others', async () => {
    mockSearchCatalogContent.mockImplementation((catalog: string) =>
      catalog === 'hs'
        ? Promise.reject(new Error('502'))
        : Promise.resolve([row(`${catalog}-1`)]),
    );

    const { result } = renderHook(() => useCatalogSearch('ted'), { wrapper });

    // The hook retries a failing catalogue once, so allow for the retry delay.
    await waitFor(() => expect(result.current.isSettled).toBe(true), {
      timeout: 5000,
    });

    expect(result.current.sections.find((s) => s.id === 'hs')?.isError).toBe(
      true,
    );
    expect(result.current.sections.find((s) => s.id === 'nf')?.isError).toBe(
      false,
    );
    expect(result.current.isAllFailed).toBe(false);
    expect(result.current.totalCount).toBe(2);
  });

  it('reports a total failure only when every catalogue failed', async () => {
    mockSearchCatalogContent.mockRejectedValue(new Error('502'));

    const { result } = renderHook(() => useCatalogSearch('ted'), { wrapper });

    await waitFor(() => expect(result.current.isAllFailed).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.totalCount).toBe(0);
  });

  /** Sections must not reorder by arrival, or posters jump around under the cursor. */
  it('keeps catalogue order regardless of which answers first', async () => {
    mockSearchCatalogContent.mockImplementation((catalog: string) =>
      catalog === 'nf'
        ? new Promise<SearchResult[]>((resolve) =>
            setTimeout(() => resolve([row('nf-1')]), 20),
          )
        : Promise.resolve([row(`${catalog}-1`)]),
    );

    const { result } = renderHook(() => useCatalogSearch('ted'), { wrapper });

    await waitFor(() => expect(result.current.isSettled).toBe(true));

    expect(result.current.sections.map((s) => s.id)).toEqual([
      'nf',
      'pv',
      'hs',
    ]);
  });
});
