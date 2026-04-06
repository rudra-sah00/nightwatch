import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as socketLib from '@/lib/socket';
import { SocketProvider, useSocket } from '@/providers/socket-provider';

vi.unmock('@/providers/socket-provider');

vi.mock('@/lib/socket', () => ({
  initSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(),
  onForceLogout: vi.fn(),
  offForceLogout: vi.fn(),
}));

describe('SocketProvider', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as unknown as Socket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(socketLib.getSocket).mockReturnValue(null);
    vi.mocked(socketLib.initSocket).mockReturnValue(mockSocket);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SocketProvider>{children}</SocketProvider>
  );

  it('should provide initial disconnected state', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect regular user', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    act(() => {
      result.current.connect('user1', 'session1', 'User', 'photo');
    });

    expect(socketLib.initSocket).toHaveBeenCalledWith(
      'user1',
      'session1',
      false,
      'User',
      'photo',
    );
    expect(result.current.socket).toBe(mockSocket);
  });

  it('should connect guest', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    act(() => {
      result.current.connectGuest();
    });

    expect(socketLib.initSocket).toHaveBeenCalledWith(
      undefined,
      undefined,
      true,
    );
    expect(result.current.socket).toBe(mockSocket);
  });

  it('should track connection status', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    act(() => {
      result.current.connectGuest();
    });

    const mockSocketInternal = mockSocket as unknown as {
      on: ReturnType<typeof vi.fn>;
    };

    // Simulate connect event
    const onConnect = mockSocketInternal.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'connect',
    )?.[1] as (() => void) | undefined;
    act(() => {
      onConnect?.();
    });
    expect(result.current.isConnected).toBe(true);

    // Simulate disconnect event
    const onDisconnect = mockSocketInternal.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'disconnect',
    )?.[1] as (() => void) | undefined;
    act(() => {
      onDisconnect?.();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('should disconnect and cleanup', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    act(() => {
      result.current.connectGuest();
      result.current.disconnect();
    });

    expect(socketLib.disconnectSocket).toHaveBeenCalled();
    expect(result.current.socket).toBeNull();
  });

  it('should reuse existing socket on initialization if present', () => {
    vi.mocked(socketLib.getSocket).mockReturnValue(mockSocket);

    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBe(mockSocket);
  });

  it('should throw error if used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSocket())).toThrow(
      'useSocket must be used within a SocketProvider',
    );
    consoleSpy.mockRestore();
  });

  it('should handle force_logout event', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });
    act(() => {
      result.current.connectGuest();
    });

    const mockSocketInternal = mockSocket as unknown as {
      on: ReturnType<typeof vi.fn>;
    };
    const onForceLogoutSocket = mockSocketInternal.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'force_logout',
    )?.[1] as ((payload: { reason: string }) => void) | undefined;
    act(() => {
      onForceLogoutSocket?.({ reason: 'testing' });
    });
  });

  it('should not reconnect if already connected', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });
    act(() => {
      result.current.connectGuest();
    });

    vi.mocked(socketLib.getSocket).mockReturnValue(mockSocket);

    act(() => {
      result.current.connectGuest(); // Second call
    });
    expect(socketLib.initSocket).toHaveBeenCalledTimes(1);
  });
});
