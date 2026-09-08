import { describe, expect, it } from 'vitest';
import { mapLinkStateToConnectionState } from '@/features/watch-party/media/hooks/useAgoraRtm';

/**
 * Agora RTM SDK 2.3.0 removed the `status` event and replaced it with
 * `linkState`, which uses a different state enum. These tests pin the
 * translation so the watch party keeps its original five-state model.
 *
 * SDK LinkState union: IDLE | CONNECTING | CONNECTED | DISCONNECTED
 * | SUSPENDED | FAILED
 *
 * Semantics per Agora's official connection-state documentation:
 * https://docs.agora.io/en/realtime-media/rtm/build/connect-and-authenticate/connection/connection-state-transitions
 */
describe('mapLinkStateToConnectionState', () => {
  it('maps CONNECTED to CONNECTED', () => {
    expect(mapLinkStateToConnectionState('CONNECTED')).toBe('CONNECTED');
  });

  it('maps CONNECTING to CONNECTING', () => {
    expect(mapLinkStateToConnectionState('CONNECTING')).toBe('CONNECTING');
  });

  it('maps DISCONNECTED to RECONNECTING because the SDK auto-retries at 2/4/8s for up to 2 minutes', () => {
    expect(mapLinkStateToConnectionState('DISCONNECTED')).toBe('RECONNECTING');
  });

  it('maps SUSPENDED to RECONNECTING because the SDK keeps retrying every 30s', () => {
    expect(mapLinkStateToConnectionState('SUSPENDED')).toBe('RECONNECTING');
  });

  it('maps FAILED to DISCONNECTED because the SDK does not retry and needs an explicit re-login', () => {
    expect(mapLinkStateToConnectionState('FAILED')).toBe('DISCONNECTED');
  });

  it('maps IDLE to DISCONNECTED (before login / after an explicit logout)', () => {
    expect(mapLinkStateToConnectionState('IDLE')).toBe('DISCONNECTED');
  });

  it('treats an unknown future state as DISCONNECTED rather than connected', () => {
    expect(mapLinkStateToConnectionState('SOME_NEW_STATE')).toBe(
      'DISCONNECTED',
    );
  });

  it('never reports CONNECTED for any non-CONNECTED LinkState', () => {
    for (const state of [
      'IDLE',
      'CONNECTING',
      'DISCONNECTED',
      'SUSPENDED',
      'FAILED',
    ]) {
      expect(mapLinkStateToConnectionState(state)).not.toBe('CONNECTED');
    }
  });

  it('treats every state where the SDK is self-recovering as RECONNECTING, not DISCONNECTED', () => {
    // A brief network blip must not surface as a hard disconnect error.
    for (const state of ['DISCONNECTED', 'SUSPENDED']) {
      expect(mapLinkStateToConnectionState(state)).toBe('RECONNECTING');
    }
  });
});
