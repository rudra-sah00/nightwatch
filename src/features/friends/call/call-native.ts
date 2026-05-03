/**
 * Native mobile call UI — CallKit (iOS) and phone call notifications (Android).
 *
 * All Capacitor plugin calls are platform-gated so iOS never touches the
 * Android-only `PhoneCallNotification` plugin and vice-versa.
 */
import { checkIsMobile } from '@/lib/electron-bridge';

type CallActions = {
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
};

/** Returns `'ios'` | `'android'` | `''` on non-native. */
function getPlatform(): string {
  return (
    (typeof window !== 'undefined' && window.Capacitor?.getPlatform?.()) || ''
  );
}

// ── State transitions ───────────────────────────────────────────────

/** Show the native incoming-call UI for the current platform. */
export function showNativeIncomingCall(callId: string, peerName: string) {
  const platform = getPlatform();
  console.log('[NW-Call] showNativeIncomingCall', {
    platform,
    peerName,
    callId,
  });

  if (platform === 'ios') {
    import('@capgo/capacitor-incoming-call-kit')
      .then(({ IncomingCallKit }) =>
        IncomingCallKit.showIncomingCall({
          callId,
          callerName: peerName || 'Nightwatch Call',
          handle: peerName || 'Voice Call',
          hasVideo: false,
          ios: { handleType: 'generic', supportsHolding: false },
        }),
      )
      .then((r) =>
        console.log('[NW-Call] CallKit showIncomingCall ok', JSON.stringify(r)),
      )
      .catch((e) => console.warn('[NW-Call] CallKit showIncomingCall err', e));
  }

  if (platform === 'android') {
    import('@anuradev/capacitor-phone-call-notification')
      .then(({ PhoneCallNotification }) =>
        PhoneCallNotification.showIncomingPhoneCallNotification({
          callingName: peerName || 'Nightwatch',
          channelName: 'Nightwatch Calls',
          channelDescription: `Incoming call from ${peerName || 'Unknown'}`,
          answerButtonText: 'Answer',
          declineButtonText: 'Decline',
        }),
      )
      .catch(() => {});
  }
}

/** Switch native UI to the "call in progress" state. */
export function showNativeActiveCall(peerName: string) {
  const platform = getPlatform();
  console.log('[NW-Call] showNativeActiveCall', { platform, peerName });

  if (platform === 'android') {
    import('@anuradev/capacitor-phone-call-notification')
      .then(({ PhoneCallNotification }) => {
        PhoneCallNotification.hideIncomingPhoneCallNotification().catch(
          () => {},
        );
        return PhoneCallNotification.showCallInProgressNotification({
          callingName: peerName || 'Nightwatch',
          channelName: 'Nightwatch Calls',
          channelDescription: 'Voice call in progress',
          terminateButtonText: 'End Call',
        });
      })
      .catch(() => {});
  }
}

/** Dismiss all native call UI. */
export function hideNativeCallUI() {
  const platform = getPlatform();
  console.log('[NW-Call] hideNativeCallUI', { platform });

  if (platform === 'ios') {
    import('@capgo/capacitor-incoming-call-kit')
      .then(({ IncomingCallKit }) => IncomingCallKit.endAllCalls())
      .then((r) =>
        console.log('[NW-Call] CallKit endAllCalls ok', JSON.stringify(r)),
      )
      .catch((e) => console.warn('[NW-Call] CallKit endAllCalls err', e));
  }

  if (platform === 'android') {
    import('@anuradev/capacitor-phone-call-notification')
      .then(({ PhoneCallNotification }) => {
        PhoneCallNotification.hideIncomingPhoneCallNotification().catch(
          () => {},
        );
        PhoneCallNotification.hideCallInProgressNotification().catch(() => {});
      })
      .catch(() => {});
  }
}

// ── Event listeners ─────────────────────────────────────────────────

/**
 * Register native call-action listeners (CallKit events on iOS,
 * notification button taps on Android). Returns a teardown function.
 */
export function registerNativeCallListeners(actions: CallActions): () => void {
  if (!checkIsMobile()) return () => {};

  const platform = getPlatform();
  const listeners: Array<Promise<{ remove: () => Promise<void> }>> = [];

  if (platform === 'ios') {
    import('@capgo/capacitor-incoming-call-kit')
      .then(({ IncomingCallKit }) => {
        listeners.push(
          IncomingCallKit.addListener('callAccepted', () =>
            actions.acceptCall(),
          ),
          IncomingCallKit.addListener('callDeclined', () =>
            actions.rejectCall(),
          ),
          IncomingCallKit.addListener('callEnded', () => actions.endCall()),
          IncomingCallKit.addListener('callTimedOut', () =>
            actions.rejectCall(),
          ),
        );
      })
      .catch(() => {});
  }

  if (platform === 'android') {
    import('@anuradev/capacitor-phone-call-notification')
      .then(({ PhoneCallNotification }) => {
        listeners.push(
          PhoneCallNotification.addListener('response', (data) => {
            console.log(
              '[NW-Call] Android notification response:',
              data.response,
            );
            if (data.response === 'answer') actions.acceptCall();
            else if (data.response === 'decline') actions.rejectCall();
            else if (data.response === 'terminate') actions.endCall();
          }),
        );
      })
      .catch(() => {});
  }

  return () => {
    for (const lp of listeners) lp.then((l) => l.remove()).catch(() => {});
  };
}

// ── Audio session ───────────────────────────────────────────────────

/** Activate the voice-call audio session (earpiece + echo cancellation). */
export function activateCallAudioSession() {
  if (!checkIsMobile()) return;
  import('@capacitor/core').then(({ registerPlugin }) => {
    const s = registerPlugin<{ setVoiceCallMode: () => Promise<void> }>(
      'NWAudioSession',
    );
    s.setVoiceCallMode().catch(() => {});
  });
}

/** Restore the normal media-playback audio session. */
export function deactivateCallAudioSession() {
  if (!checkIsMobile()) return;
  import('@capacitor/core').then(({ registerPlugin }) => {
    const s = registerPlugin<{ setMediaMode: () => Promise<void> }>(
      'NWAudioSession',
    );
    s.setMediaMode().catch(() => {});
  });
}

/** Toggle audio output between speaker and earpiece. Returns the new state. */
export function toggleAudioOutput(currentIsSpeaker: boolean): boolean {
  if (!checkIsMobile()) return currentIsSpeaker;
  const next = !currentIsSpeaker;
  import('@capacitor/core').then(({ registerPlugin }) => {
    const s = registerPlugin<{
      setOutputToSpeaker: () => Promise<void>;
      setOutputToEarpiece: () => Promise<void>;
    }>('NWAudioSession');
    (next ? s.setOutputToSpeaker() : s.setOutputToEarpiece()).catch(() => {});
  });
  return next;
}
