import { renderHook } from '@testing-library/react';
import type React from 'react';
import { act, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ServerProvider, useServer } from '@/providers/server-provider';

type ServerId = 's1' | 's2';

function Wrapper({
  children,
  defaultServer,
}: {
  children: React.ReactNode;
  defaultServer?: ServerId;
}) {
  return (
    <ServerProvider defaultServer={defaultServer}>{children}</ServerProvider>
  );
}

describe('ServerProvider / useServer', () => {
  it('provides default server s2 when no defaultServer given', () => {
    const { result } = renderHook(() => useServer(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ServerProvider>{children}</ServerProvider>
      ),
    });
    expect(result.current.activeServer).toBe('s2');
    expect(result.current.serverLabel).toBe('Balanced');
  });

  it('uses defaultServer prop as initial value', () => {
    const { result } = renderHook(() => useServer(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ServerProvider defaultServer="s1">{children}</ServerProvider>
      ),
    });
    expect(result.current.activeServer).toBe('s1');
    expect(result.current.serverLabel).toBe('Netflix');
  });

  it('setActiveServer updates active server and label', () => {
    const { result } = renderHook(() => useServer(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ServerProvider defaultServer="s1">{children}</ServerProvider>
      ),
    });

    act(() => {
      result.current.setActiveServer('s2');
    });

    expect(result.current.activeServer).toBe('s2');
    expect(result.current.serverLabel).toBe('Balanced');
  });

  it('syncs when defaultServer prop changes to a different value', () => {
    const _currentDefaultServer: ServerId = 's1';

    function ControlledWrapper({ children }: { children: React.ReactNode }) {
      const [server, setServer] = useState<ServerId>('s1');
      // expose setter via window for testing
      (window as unknown as Record<string, unknown>).__setDefaultServer =
        setServer;
      return <ServerProvider defaultServer={server}>{children}</ServerProvider>;
    }

    const { result } = renderHook(() => useServer(), {
      wrapper: ControlledWrapper,
    });
    expect(result.current.activeServer).toBe('s1');

    act(() => {
      (
        (window as unknown as Record<string, unknown>).__setDefaultServer as (
          s: ServerId,
        ) => void
      )('s2');
    });

    expect(result.current.activeServer).toBe('s2');
    _currentDefaultServer; // suppress lint
  });

  it('does not re-sync when defaultServer prop equals current active server', () => {
    // If already on s1 and parent re-renders with defaultServer=s1, no state change needed
    const { result, rerender } = renderHook(() => useServer(), {
      wrapper: Wrapper,
    });

    // Default starts at s2
    act(() => {
      result.current.setActiveServer('s1');
    });
    expect(result.current.activeServer).toBe('s1');

    // Re-render with defaultServer=s1 — should not toggle back to s2
    rerender();
    expect(result.current.activeServer).toBe('s1');
  });

  it('falls back to s2 when defaultServer prop is undefined', () => {
    const { result } = renderHook(() => useServer(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ServerProvider>{children}</ServerProvider>
      ),
    });
    expect(result.current.activeServer).toBe('s2');
  });
});
