import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
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
  remoteVideoRef: React.RefObject<HTMLDivElement | null>,
): Promise<{
  client: IAgoraRTCClient;
  audioTrack: IMicrophoneAudioTrack;
}> {
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
    if (mediaType === 'video' && remoteVideoRef.current) {
      remoteUser.videoTrack?.play(remoteVideoRef.current);
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
