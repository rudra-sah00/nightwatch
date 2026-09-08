/**
 * Integration test for the real @noriginmedia/norigin-spatial-navigation
 * library — deliberately NOT mocked.
 *
 * Every other Smart TV test mocks this package, so none of them can catch the
 * failure mode this file exists to guard: if the meta package's `core` half and
 * its `react` half resolve to two different `core` copies, `init()` configures
 * the SpatialNavigation singleton in one copy while `useFocusable()` registers
 * focusables against the never-initialised singleton in the other. In a real
 * browser that throws
 * "Cannot read properties of undefined (reading 'measureLayout')".
 *
 * The decisive check here is "registers focusables against the same singleton"
 * — it was verified to fail (`doesFocusableExist` returns false) after
 * deliberately re-pinning the react half to 3.2.0 to recreate the split tree.
 *
 * Guard with: pnpm why "@noriginmedia/*"  -> must report exactly one core.
 */

import {
  doesFocusableExist,
  FocusContext,
  getCurrentFocusKey,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSpatialNavigation } from '@/platforms/smart-tv/lib/spatial-navigation';

function Child({ focusKey }: { focusKey: string }) {
  const { ref, focused } = useFocusable({ focusKey });
  return (
    <div ref={ref} data-testid={focusKey} data-focused={focused}>
      {focusKey}
    </div>
  );
}

function Parent({ children }: { children: React.ReactNode }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'PARENT',
    saveLastFocusedChild: true,
    trackChildren: true,
  });
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>{children}</div>
    </FocusContext.Provider>
  );
}

describe('spatial navigation (real library, unmocked)', () => {
  beforeAll(() => {
    initSpatialNavigation();
  });

  it('mounts focusables without throwing (catches the split-core measureLayout crash)', () => {
    expect(() =>
      render(
        <Parent>
          <Child focusKey="ITEM_A" />
          <Child focusKey="ITEM_B" />
        </Parent>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId('ITEM_A')).toBeInTheDocument();
    expect(screen.getByTestId('ITEM_B')).toBeInTheDocument();
  });

  it('registers focusables against the same singleton that init() configured', () => {
    render(
      <Parent>
        <Child focusKey="ITEM_C" />
      </Parent>,
    );
    // If init() and useFocusable() were touching different core copies, the
    // service would not know about these keys at all.
    expect(doesFocusableExist('PARENT')).toBe(true);
    expect(doesFocusableExist('ITEM_C')).toBe(true);
    expect(doesFocusableExist('NOT_A_REAL_KEY')).toBe(false);
  });

  it('setFocus / getCurrentFocusKey round-trip through the live service', async () => {
    render(
      <Parent>
        <Child focusKey="ITEM_D" />
        <Child focusKey="ITEM_E" />
      </Parent>,
    );
    // core 4's LayoutAdapter.measureLayout returns a Promise (it was
    // synchronous in core 3), so setFocus resolves asynchronously. Flush
    // pending microtasks before reading the focus key.
    //
    // No app code depends on a synchronous read-after-setFocus:
    // use-tv-focus.ts calls setFocus inside a 50ms timeout and only reads
    // getCurrentFocusKey on cleanup, and TvRootLayout calls it fire-and-forget.
    await act(async () => {
      setFocus('ITEM_E');
    });
    expect(getCurrentFocusKey()).toBe('ITEM_E');

    await act(async () => {
      setFocus('ITEM_D');
    });
    expect(getCurrentFocusKey()).toBe('ITEM_D');
  });

  it('exposes the core 4 layoutAdapter exports the init config relies on', async () => {
    const mod = await import('@noriginmedia/norigin-spatial-navigation');
    expect(typeof mod.GetBoundingClientRectAdapter).toBe('function');
    expect(typeof mod.init).toBe('function');
    expect(typeof mod.setKeyMap).toBe('function');
    expect(typeof mod.useFocusable).toBe('function');
  });
});
