import { vi } from 'vitest';

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
export const emitTypingStart = vi.fn();
export const emitTypingStop = vi.fn();
export const emitPing = vi.fn();
export const emitPartyEvent = vi.fn();

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
export const onUserTyping = vi.fn(() => vi.fn());
export const onPartyHostDisconnected = vi.fn(() => vi.fn());
export const onPartyHostReconnected = vi.fn(() => vi.fn());
