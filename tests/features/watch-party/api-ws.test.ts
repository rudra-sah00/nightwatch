import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/api';
import * as ws from '@/lib/ws';

vi.mock('@/lib/ws');
vi.mock('@/lib/env', () => ({
  env: {
    BACKEND_URL: 'http://localhost:4000',
  },
}));

describe('Watch Party WebSocket API', () => {
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as Partial<Socket>;
    vi.clearAllMocks();
  });

  describe('createPartyRoom', () => {
    it('should emit party:create with payload', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const payload = {
        contentId: 'test-123',
        streamUrl: 'https://example.com/stream.m3u8',
        title: 'Test Movie',
        type: 'movie' as const,
        isPublic: true,
      };
      const callback = vi.fn();

      api.createPartyRoom(payload, callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:create',
        payload,
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.createPartyRoom(
        {
          contentId: 'test-123',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test',
          type: 'movie',
        },
        callback,
      );

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('requestJoinPartyRoom', () => {
    it('should emit party:join_request with payload', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const payload = { roomId: 'room1' };
      const callback = vi.fn();

      api.requestJoinPartyRoom(payload, callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:join_request',
        payload,
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.requestJoinPartyRoom({ roomId: 'room1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('leavePartyRoom', () => {
    it('should emit party:leave', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.leavePartyRoom(callback);

      expect(mockSocket.emit).toHaveBeenCalledWith('party:leave', callback);
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.leavePartyRoom(callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('syncPartyState', () => {
    it('should emit party:sync with payload', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const payload = {
        isPlaying: true,
        currentTime: 100,
      };
      const callback = vi.fn();

      api.syncPartyState(payload, callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:sync',
        payload,
        callback,
      );
    });

    it('should handle no socket connection with callback', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.syncPartyState({ isPlaying: true, currentTime: 0 }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });

    it('should work without callback', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      api.syncPartyState({
        isPlaying: true,
        currentTime: 0,
      });

      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('sendPartyMessage', () => {
    it('should emit party:send_message with content', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.sendPartyMessage('Hello!', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:send_message',
        { content: 'Hello!' },
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.sendPartyMessage('Hello!', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });

    it('should work without callback', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      api.sendPartyMessage('Hello!');

      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('getPartyMessages', () => {
    it('should emit party:get_messages', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.getPartyMessages(callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_messages',
        {},
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.getPartyMessages(callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('approveJoinRequest', () => {
    it('should emit party:approve_request', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.approveJoinRequest('member1', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:approve_request',
        { memberId: 'member1' },
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.approveJoinRequest('member1', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('rejectJoinRequest', () => {
    it('should emit party:reject_request', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.rejectJoinRequest('member1', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:reject_request',
        { memberId: 'member1' },
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.rejectJoinRequest('member1', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('kickMember', () => {
    it('should emit party:kick_member', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.kickMember('member1', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:kick_member',
        { memberId: 'member1' },
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.kickMember('member1', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('getPartyRoom', () => {
    it('should emit party:get_room', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.getPartyRoom('room1', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_room',
        { roomId: 'room1' },
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.getPartyRoom('room1', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('updatePartyContent', () => {
    it('should emit party:update_content', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const payload = { title: 'New Movie', type: 'movie' as const };
      const callback = vi.fn();

      api.updatePartyContent(payload, callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_content',
        payload,
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.updatePartyContent({ title: 'New', type: 'movie' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('getPartyStreamToken', () => {
    it('should emit party:get_stream_token', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.getPartyStreamToken(callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_stream_token',
        {},
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.getPartyStreamToken(callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('requestPartyState', () => {
    it('should emit party:request_state', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.requestPartyState(callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:request_state',
        {},
        callback,
      );
    });

    it('should handle no socket connection', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.requestPartyState(callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });

  describe('Event Listeners', () => {
    describe('onPartyStateUpdate', () => {
      it('should register listener and return cleanup function', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyStateUpdate(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:state_update',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:state_update',
          callback,
        );
      });

      it('should return noop when no socket', () => {
        vi.mocked(ws.getSocket).mockReturnValue(null);

        const cleanup = api.onPartyStateUpdate(vi.fn());

        expect(mockSocket.on).not.toHaveBeenCalled();
        cleanup(); // Should not throw
      });
    });

    describe('onPartyMemberJoined', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyMemberJoined(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:member_joined',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:member_joined',
          callback,
        );
      });

      it('should return noop when no socket', () => {
        vi.mocked(ws.getSocket).mockReturnValue(null);

        const cleanup = api.onPartyMemberJoined(vi.fn());
        cleanup();
      });
    });

    describe('onPartyMemberLeft', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyMemberLeft(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:member_left',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:member_left',
          callback,
        );
      });
    });

    describe('onPartyClosed', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyClosed(callback);

        expect(mockSocket.on).toHaveBeenCalledWith('party:closed', callback);

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith('party:closed', callback);
      });
    });

    describe('onPartyContentUpdated', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyContentUpdated(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:content_updated',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:content_updated',
          callback,
        );
      });
    });

    describe('onPartyAdminRequest', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyAdminRequest(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:admin_request',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:admin_request',
          callback,
        );
      });
    });

    describe('onPartyJoinApproved', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyJoinApproved(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:join_approved',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:join_approved',
          callback,
        );
      });
    });

    describe('onPartyJoinRejected', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyJoinRejected(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:join_rejected',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:join_rejected',
          callback,
        );
      });
    });

    describe('onPartyKicked', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyKicked(callback);

        expect(mockSocket.on).toHaveBeenCalledWith('party:kicked', callback);

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith('party:kicked', callback);
      });
    });

    describe('onPartyMessage', () => {
      it('should register listener', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyMessage(callback);

        expect(mockSocket.on).toHaveBeenCalledWith('party:message', callback);

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith('party:message', callback);
      });

      it('should return noop when no socket', () => {
        vi.mocked(ws.getSocket).mockReturnValue(null);

        const cleanup = api.onPartyMessage(vi.fn());
        cleanup();
      });
    });

    describe('onPartyMemberRejected', () => {
      it('should register listener and return cleanup', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onPartyMemberRejected(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:member_rejected',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:member_rejected',
          callback,
        );
      });

      it('should return noop when no socket', () => {
        vi.mocked(ws.getSocket).mockReturnValue(null);

        const cleanup = api.onPartyMemberRejected(vi.fn());
        cleanup();
      });
    });

    describe('onUserTyping', () => {
      it('should register listener and return cleanup', () => {
        vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

        const callback = vi.fn();
        const cleanup = api.onUserTyping(callback);

        expect(mockSocket.on).toHaveBeenCalledWith(
          'party:user_typing',
          callback,
        );

        cleanup();
        expect(mockSocket.off).toHaveBeenCalledWith(
          'party:user_typing',
          callback,
        );
      });

      it('should return noop when no socket', () => {
        vi.mocked(ws.getSocket).mockReturnValue(null);

        const cleanup = api.onUserTyping(vi.fn());
        cleanup();
      });
    });
  });

  describe('emitTypingStart', () => {
    it('should emit typing start event', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      api.emitTypingStart();

      expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_start');
    });

    it('should do nothing when no socket', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      api.emitTypingStart();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitTypingStop', () => {
    it('should emit typing stop event', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      api.emitTypingStop();

      expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_stop');
    });

    it('should do nothing when no socket', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      api.emitTypingStop();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('fetchPendingRequests', () => {
    it('should fetch pending requests via socket', () => {
      vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);

      const callback = vi.fn();
      api.fetchPendingRequests('room-123', callback);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:fetch_pending',
        { roomId: 'room-123' },
        callback,
      );
    });

    it('should call callback with error when no socket', () => {
      vi.mocked(ws.getSocket).mockReturnValue(null);

      const callback = vi.fn();
      api.fetchPendingRequests('room-123', callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });
  });
});
