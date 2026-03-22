import { describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { SketchAction } from '@/features/watch-party/room/types';
import { getSocket } from '@/lib/socket';

vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(),
}));

describe('watch-party.api error branches', () => {
  it('should handle all !socket cases in watch-party.api', () => {
    vi.mocked(getSocket).mockReturnValue(null);
    const callback = vi.fn();

    // List of functions to test for !socket branch
    api.sendPartyMessage('hello', callback);
    api.getPartyMessages(callback);
    api.emitPartyInteraction({ type: 'emoji', value: '😀' }, callback);
    api.requestJoinPartyRoom({ roomId: '1', name: 'U' }, callback);
    api.approveJoinRequest('m1', callback);
    api.rejectJoinRequest('m1', callback);
    api.kickMember('m1', callback);
    api.leavePartyRoom(callback);
    api.syncPartyState({ isPlaying: true, currentTime: 0 }, callback);
    api.requestPartyState(callback);
    api.getPartyRoom('r1', callback);
    api.updatePartyContent({ title: 'T', type: 'movie' }, callback);
    api.getPartyStreamToken(callback);
    api.fetchPendingRequests('r1', callback);
    api.updatePartyPermissions({}, callback);
    api.updateMemberPermissions('m1', {}, callback);
    api.emitSketchDraw(
      {
        id: '1',
        type: 'pencil',
        points: [],
        color: '#000',
        strokeWidth: 2,
        videoTimestamp: 0,
        data: [],
      } as unknown as SketchAction,
      callback,
    );
    api.emitSketchClear({ type: 'all' }, callback);
    api.emitSketchUndo({ actionId: '1' }, callback);
    api.updatePartyTheme({ theme: 'light', customColor: '#fff' }, callback);

    // Some functions don't take callback but still have !socket check
    api.onPartyStateUpdate(() => {});
    api.onPartyMemberJoined(() => {});
    api.onPartyMemberLeft(() => {});
    api.onPartyClosed(() => {});
    api.onPartyContentUpdated(() => {});
    api.onPartyAdminRequest(() => {});
    api.onPartyJoinApproved(() => {});
    api.onPartyJoinRejected(() => {});
    api.onPartyKicked(() => {});
    api.onPartyMemberRejected(() => {});
    api.onPartyMessage(() => {});
    api.onUserTyping(() => {});
    api.onPartyHostDisconnected(() => {});
    api.onPartyHostReconnected(() => {});
    api.onPartyInteraction(() => {});
    api.onPartyPermissionsUpdated(() => {});
    api.onPartyMemberPermissionsUpdated(() => {});
    api.onSketchDraw(() => {});
    api.onSketchClear(() => {});
    api.emitSketchRequestSync();
    api.onSketchProvideSync(() => {});
    api.emitSketchSyncState('u1', []);
    api.onSketchSyncState(() => {});
    api.onSketchUndo(() => {});
    api.onPartyThemeUpdated(() => {});

    expect(callback).toHaveBeenCalledWith({
      success: false,
      error: 'Not connected',
    });
    expect(callback).toHaveBeenCalledTimes(20);
  });
});
