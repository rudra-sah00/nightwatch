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

type EventHandler = (...args: unknown[]) => void;

function createMockSocket(connected = false) {
  const handlers = new Map<string, EventHandler[]>();
  return {
    connected,
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
    }),
    off: vi.fn((event: string, handler?: EventHandler) => {
      if (handler) {
        const list = handlers.get(event) || [];
        handlers.set(
          event,
          list.filter((h) => h !== handler),
        );
      } else {
        handlers.delete(event);
      }
    }),
    emit: vi.fn(),
    _trigger(event: string, ...args: unknown[]) {
      for (const h of handlers.get(event) || []) h(...args);
    },
  } as unknown as Socket & { _trigger: (e: string, ...a: unknown[]) => void };
}

describe('Socket reconnection behavior', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SocketProvider>{children}</SocketProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    vi.mocked(socketLib.getSocket).mockReturnValue(null);
    vi.mocked(socketLib.initSocket).mockResolvedValue(mockSocket as Socket);
  });

  it('happy path: reconnects and restores isConnected state', async () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    await act(async () => {
      await result.current.connect('u1', 's1');
    });

    // Simulate connect
    act(() => mockSocket._trigger('connect'));
    expect(result.current.isConnected).toBe(true);

    // Simulate disconnect (transport error triggers reconnection by socket.io)
    act(() => mockSocket._trigger('disconnect', 'transport error'));
    expect(result.current.isConnected).toBe(false);

    // Simulate automatic reconnect
    act(() => mockSocket._trigger('connect'));
    expect(result.current.isConnected).toBe(true);
  });

  it('error case: connect_error does not crash and reports correctly', async () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    await act(async () => {
      await result.current.connect('u1', 's1');
    });

    // Simulate connect error (e.g., server unreachable during reconnection)
    act(() => mockSocket._trigger('connect_error', new Error('ECONNREFUSED')));

    // Should remain disconnected but not throw
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBe(mockSocket);
  });

  it('edge case: in-flight emit during disconnection still resolves socket ref', async () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    await act(async () => {
      await result.current.connect('u1', 's1');
    });

    act(() => mockSocket._trigger('connect'));
    expect(result.current.isConnected).toBe(true);

    // Simulate emitting during connected state
    act(() => {
      result.current.socket!.emit('some-event', { data: 'test' });
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('some-event', {
      data: 'test',
    });

    // Disconnect happens - socket ref still available for queuing
    act(() => mockSocket._trigger('disconnect', 'transport close'));
    expect(result.current.isConnected).toBe(false);
    // Socket ref remains non-null so callers can queue operations
    expect(result.current.socket).not.toBeNull();
  });

  it('edge case: disconnect() during reconnection clears socket entirely', async () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    await act(async () => {
      await result.current.connect('u1', 's1');
    });

    act(() => mockSocket._trigger('disconnect', 'transport error'));

    // User-initiated disconnect during reconnection window
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(socketLib.disconnectSocket).toHaveBeenCalled();
  });

  it('edge case: already connected socket detected on mount', () => {
    const connectedSocket = createMockSocket(true);
    vi.mocked(socketLib.getSocket).mockReturnValue(connectedSocket as Socket);

    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBe(connectedSocket);
  });
});
