import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';
import { apiFetch } from '@/lib/fetch';
import {
  CALL_AUDIO_ENCODER,
  CALL_VIDEO_ENCODER,
  CALL_VIDEO_OPTIMIZATION,
} from './call.config';

/** Fetch an Agora RTC token for a DM call channel. */
export async function fetchCallToken(channel: string) {
  return apiFetch<{ token: string; appId: string; uid: number }>(
    `/api/agora/call-token?channelName=${encodeURIComponent(channel)}`,
  );
}

/** Create an Agora RTC client, join the channel, and publish a mic track. */
export async function connectToAgoraCall(
  channel: string,
  token: string,
  appId: string,
  uid: number,
  callbacks: {
    onRemoteVideo: (track: IRemoteVideoTrack) => void;
    onRemoteVideoStopped: () => void;
  },
): Promise<{
  client: IAgoraRTCClient;
  audioTrack: IMicrophoneAudioTrack;
}> {
  // Pre-check mic permission (required for iOS Capacitor WebView)
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Microphone is not available. This requires a secure (HTTPS) connection.',
    );
  }
  try {
    const testStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    for (const track of testStream.getTracks()) track.stop();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw new Error(
        'Microphone access denied. Please allow microphone in Settings.',
      );
    }
    throw err;
  }

  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
  AgoraRTC.setLogLevel(process.env.NODE_ENV === 'production' ? 4 : 2);
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  await client.join(appId, channel, token, uid);

  const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: CALL_AUDIO_ENCODER,
  });
  await client.publish([audioTrack]);

  client.on('user-published', async (remoteUser, mediaType) => {
    await client.subscribe(remoteUser, mediaType);
    if (mediaType === 'audio') {
      remoteUser.audioTrack?.play();
    }
    if (mediaType === 'video' && remoteUser.videoTrack) {
      callbacks.onRemoteVideo(remoteUser.videoTrack);
    }
  });

  client.on('user-unpublished', (_remoteUser, mediaType) => {
    if (mediaType === 'video') {
      callbacks.onRemoteVideoStopped();
    }
  });

  return { client, audioTrack };
}

/** Create and publish a camera video track. */
export async function createCallVideoTrack(
  client: IAgoraRTCClient,
): Promise<ICameraVideoTrack> {
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
  const videoTrack = await AgoraRTC.createCameraVideoTrack({
    encoderConfig: CALL_VIDEO_ENCODER,
    optimizationMode: CALL_VIDEO_OPTIMIZATION,
  });
  await client.publish([videoTrack]);
  return videoTrack;
}
