import { vi } from 'vitest';

// Async queries
export const checkRoomExists = vi.fn();
export const getRoomDetails = vi.fn();
export const getPartyRoom = vi.fn();
export const getTrendingSounds = vi.fn();
export const searchSounds = vi.fn();

export const createPartyRoom = vi.fn();
export const requestJoinPartyRoom = vi.fn();
export const leavePartyRoom = vi.fn();
export const approveJoinRequest = vi.fn();
export const rejectJoinRequest = vi.fn();
export const kickMember = vi.fn();
export const sendPartyMessage = vi.fn();
export const getPartyMessages = vi.fn();
export const getPartyStreamToken = vi.fn();
export const requestPartyState = vi.fn();
export const syncPartyState = vi.fn();
export const updatePartyContent = vi.fn();
export const updateMemberPermissions = vi.fn();
export const updatePartyPermissions = vi.fn();
export const emitTypingStart = vi.fn();
export const emitTypingStop = vi.fn();
export const emitPing = vi.fn();
export const emitPartyEvent = vi.fn();
export const emitPartyInteraction = vi.fn();

// Sketch Emitters
export const emitSketchDraw = vi.fn();
export const emitSketchClear = vi.fn();
export const emitSketchRequestSync = vi.fn();
export const emitSketchSyncState = vi.fn();

// Event listeners — return cleanup fn
export const onPartyStateUpdate = vi.fn(() => vi.fn());
export const onPartyMemberJoined = vi.fn(() => vi.fn());
export const onPartyMemberLeft = vi.fn(() => vi.fn());
export const onPartyMemberRejected = vi.fn(() => vi.fn());
export const onPartyAdminRequest = vi.fn(() => vi.fn());
export const onPartyJoinApproved = vi.fn(() => vi.fn());
export const onPartyJoinRejected = vi.fn(() => vi.fn());
export const onPartyKicked = vi.fn(() => vi.fn());
export const onPartyClosed = vi.fn(() => vi.fn());
export const onPartyMessage = vi.fn(() => vi.fn());
export const onPartyContentUpdated = vi.fn(() => vi.fn());
export const onPartyPermissionsUpdated = vi.fn(() => vi.fn());
export const onPartyMemberPermissionsUpdated = vi.fn(() => vi.fn());
export const onUserTyping = vi.fn(() => vi.fn());
export const onPartyHostDisconnected = vi.fn(() => vi.fn());
export const onPartyHostReconnected = vi.fn(() => vi.fn());
export const onPartyInteraction = vi.fn(() => vi.fn());

// Sketch Listeners
export const onSketchDraw = vi.fn(() => vi.fn());
export const onSketchClear = vi.fn(() => vi.fn());
export const onSketchProvideSync = vi.fn(() => vi.fn());
export const onSketchSyncState = vi.fn(() => vi.fn());

// Theme
export const updatePartyTheme = vi.fn();
export const onPartyThemeUpdated = vi.fn(() => vi.fn());

// Pending requests
export const fetchPendingRequests = vi.fn();
