import type { ICameraVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

/**
 * Agora RTC types shared by the engine hook and its consumers.
 *
 * Extracted from `useAgora.ts` so a component that renders a participant tile can
 * name an `AgoraParticipant` without importing a 900-line hook that loads the SDK.
 *
 * @packageDocumentation
 */

/** Possible connection states with the project's Agora RTC client. */
export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTING';

/** Agora's own 0–6 quality scale, in both directions. */
export interface NetworkQuality {
  /** 0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=very bad, 6=down */
  uplink: number;
  /** 0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=very bad, 6=down */
  downlink: number;
}

/** A selectable input or output device. */
export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

/** One person in the voice/video call, local or remote. */
export interface AgoraParticipant {
  uid: string;
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  metadata?: string;
  /** Video track for rendering */
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack;
  /** True if this is the local user */
  isLocal: boolean;
  /** Audio level 0-1 */
  audioLevel: number;
}

/**
 * The party-roster fields needed to put a name to a numeric Agora UID.
 *
 * Agora channels identify users by a 32-bit integer, so the roster is the only
 * way back to a real user id — see `uidToMemberMap`.
 */
export interface MemberInfo {
  id: string;
  name: string;
  profilePhoto?: string;
}

/** Options for the Agora RTC engine hook. */
export interface UseAgoraOptions {
  token: string | null;
  appId: string;
  channel: string;
  uid: number;
  /** Room members — used to map Agora numeric UIDs back to real user IDs/names */
  members?: MemberInfo[];
  /** Current user identity string used to identify "You" in the participant list */
  userId?: string;
}
