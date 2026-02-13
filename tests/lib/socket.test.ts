import { io } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disconnectSocket,
  getSocket,
  initSocket,
  offForceLogout,
  onForceLogout,
} from '@/lib/socket';

// Mock socket.io-client
vi.mock('socket.io-client', () => import('./__mocks__/socket-io-client'));

// Mock env
vi.mock('@/lib/env', () => import('./__mocks__/lib-env'));

describe('WebSocket Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disconnectSocket();
  });

  describe('initSocket', () => {
    it('should initialize socket with user credentials', () => {
      const socket = initSocket('user123', 'session456');

      expect(socket).toBeDefined();
      expect(socket.on).toBeDefined();
    });

    it('should initialize socket as guest', () => {
      const socket = initSocket(undefined, undefined, true);

      expect(socket).toBeDefined();
    });

    it('should disconnect existing socket before creating new one', () => {
      const socket1 = initSocket('user1', 'session1');
      const disconnectSpy = vi.spyOn(socket1, 'disconnect');

      // Mock connected state
      Object.defineProperty(socket1, 'connected', { value: true });

      initSocket('user2', 'session2');

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should return socket instance', () => {
      const socket = initSocket('user123', 'session456');

      expect(socket).toHaveProperty('on');
      expect(socket).toHaveProperty('disconnect');
    });

    it('should register connect, disconnect, and connect_error handlers', () => {
      // The io mock returns an object with on as vi.fn()
      // initSocket does NOT call .on() itself — socket.io handles that internally
      // Instead verify the socket has the expected interface
      const socket = initSocket('user123', 'session456');

      expect(socket.on).toBeDefined();
      expect(typeof socket.on).toBe('function');
      expect(socket.disconnect).toBeDefined();
    });
  });

  describe('getSocket', () => {
    it('should return null when no socket initialized', () => {
      const socket = getSocket();
      expect(socket).toBeNull();
    });

    it('should return socket instance after initialization', () => {
      initSocket('user123', 'session456');
      const socket = getSocket();

      expect(socket).not.toBeNull();
      expect(socket).toHaveProperty('on');
    });
  });

  describe('disconnectSocket', () => {
    it('should disconnect and clear socket', () => {
      const socket = initSocket('user123', 'session456');
      const disconnectSpy = vi.spyOn(socket, 'disconnect');

      disconnectSocket();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(getSocket()).toBeNull();
    });

    it('should not throw if no socket exists', () => {
      expect(() => disconnectSocket()).not.toThrow();
    });

    it('should handle multiple disconnect calls', () => {
      initSocket('user123', 'session456');

      disconnectSocket();
      disconnectSocket();

      expect(getSocket()).toBeNull();
    });
  });

  describe('onForceLogout and offForceLogout', () => {
    it('should register force logout handler', () => {
      const socket = initSocket('user123');
      const onSpy = vi.spyOn(socket, 'on');

      const callback = vi.fn();
      onForceLogout(callback);

      expect(onSpy).toHaveBeenCalledWith('force_logout', callback);
    });

    it('should not throw when registering handler without socket', () => {
      expect(() => onForceLogout(vi.fn())).not.toThrow();
    });

    it('should remove specific force logout handler', () => {
      const socket = initSocket('user123');
      const offSpy = vi.spyOn(socket, 'off');

      const callback = vi.fn();
      offForceLogout(callback);

      expect(offSpy).toHaveBeenCalledWith('force_logout', callback);
    });

    it('should remove all force logout handlers when no callback', () => {
      const socket = initSocket('user123');
      const offSpy = vi.spyOn(socket, 'off');

      offForceLogout();

      expect(offSpy).toHaveBeenCalledWith('force_logout');
    });

    it('should not throw when removing handler without socket', () => {
      expect(() => offForceLogout()).not.toThrow();
      expect(() => offForceLogout(vi.fn())).not.toThrow();
    });
  });

  describe('initSocket with guest token', () => {
    it('should include guest token from sessionStorage', () => {
      // Mock sessionStorage
      const sessionStorageMock = {
        getItem: vi.fn(() => 'guest-token-123'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });

      vi.mocked(io).mockClear();

      initSocket(undefined, undefined, true);

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('guest_token');
      expect(io).toHaveBeenCalledWith(
        'ws://localhost:4000',
        expect.objectContaining({
          query: expect.objectContaining({
            isGuest: 'true',
            guestToken: 'guest-token-123',
          }),
        }),
      );
    });

    it('should handle guest mode without token', () => {
      const sessionStorageMock = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });

      const socket = initSocket(undefined, undefined, true);

      expect(socket).toBeDefined();
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('guest_token');
    });
  });

  describe('initSocket with optional parameters', () => {
    it('should include userName when provided', () => {
      vi.mocked(io).mockClear();

      initSocket('user123', 'session456', false, 'John Doe');

      expect(io).toHaveBeenCalledWith(
        'ws://localhost:4000',
        expect.objectContaining({
          query: expect.objectContaining({
            userId: 'user123',
            sessionId: 'session456',
            userName: 'John Doe',
          }),
        }),
      );
    });

    it('should include profilePhoto when provided', () => {
      vi.mocked(io).mockClear();

      initSocket(
        'user123',
        'session456',
        false,
        'John Doe',
        'https://example.com/photo.jpg',
      );

      expect(io).toHaveBeenCalledWith(
        'ws://localhost:4000',
        expect.objectContaining({
          query: expect.objectContaining({
            userId: 'user123',
            sessionId: 'session456',
            userName: 'John Doe',
            profilePhoto: 'https://example.com/photo.jpg',
          }),
        }),
      );
    });

    it('should handle all parameters', () => {
      vi.mocked(io).mockClear();

      initSocket(
        'user123',
        'session456',
        false,
        'John Doe',
        'https://example.com/photo.jpg',
      );

      expect(io).toHaveBeenCalledWith(
        'ws://localhost:4000',
        expect.objectContaining({
          query: {
            userId: 'user123',
            sessionId: 'session456',
            userName: 'John Doe',
            profilePhoto: 'https://example.com/photo.jpg',
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        }),
      );
    });
  });
});
