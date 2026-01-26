import {
  LogLevel,
  type Participant,
  Room,
  RoomEvent,
  setLogLevel,
} from 'livekit-client';
import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

// Suppress LiveKit logs
setLogLevel(LogLevel.warn);

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export function useLiveKit(token: string | null, serverUrl: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Device states
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');

  // Fetch available devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first to get labeled devices
      await navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
        })
        .catch(() => {
          // Ignore permission errors, we'll still try to enumerate
        });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          kind: 'audioinput' as const,
        }));

      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));

      setAudioInputDevices(audioInputs);
      setVideoInputDevices(videoInputs);

      // Set default selection if not set
      if (!selectedAudioDevice && audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (!selectedVideoDevice && videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (_error) {
      // Silently fail or minimal feedback
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  // Listen for device changes
  useEffect(() => {
    refreshDevices();

    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        refreshDevices,
      );
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (!token) return;

    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
      },
    });

    // Set up event listeners
    newRoom
      // ... listeners ...
      .on(RoomEvent.Connected, () => {
        setParticipants([
          ...newRoom.remoteParticipants.values(),
          newRoom.localParticipant,
        ]);
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipants((prev) => [...prev, participant]);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants((prev) =>
          prev.filter((p) => p.identity !== participant.identity),
        );
      })
      .on(RoomEvent.LocalTrackPublished, () => {
        setParticipants((prev) => [...prev]);
      })
      .on(RoomEvent.LocalTrackUnpublished, () => {
        setParticipants((prev) => [...prev]);
      })
      .on(RoomEvent.TrackSubscribed, () => {
        setParticipants((prev) => [...prev]);
      })
      .on(RoomEvent.TrackUnsubscribed, () => {
        setParticipants((prev) => [...prev]);
      })
      .on(RoomEvent.TrackSubscriptionFailed, () => {
        // Silently fail or use toast if needed, but remove console.error
      })
      .on(RoomEvent.TrackMuted, () => {
        setParticipants((prev) => [...prev]);
      })
      .on(RoomEvent.TrackUnmuted, () => {
        setParticipants((prev) => [...prev]);
      });

    newRoom
      .connect(serverUrl, token, {
        rtcConfig: {
          // iceTransportPolicy: 'relay', // Removed for production to allow direct connections
          iceServers: [
            {
              urls: 'stun:livekit.rudrasahoo.live:3479',
            },
            {
              urls: 'turn:livekit.rudrasahoo.live:3479',
              username: 'livekit',
              credential: 'turnpassword123',
            },
          ],
        },
      })
      .then(async () => {
        setRoom(newRoom);
        setParticipants([
          ...newRoom.remoteParticipants.values(),
          newRoom.localParticipant,
        ]);
      })
      .catch((_e) => {
        toast.error('Failed to connect to voice/video server');
      });

    return () => {
      newRoom.disconnect();
    };
  }, [token, serverUrl]);

  const toggleAudio = async () => {
    if (!room) {
      toast.error('Not connected to voice server yet. Please wait...');
      return;
    }
    try {
      const newState = !audioEnabled;
      // This triggers the browser permission prompt if not already granted
      await room.localParticipant.setMicrophoneEnabled(newState);
      setAudioEnabled(newState);
      // biome-ignore lint/suspicious/noExplicitAny: Error object handling
    } catch (error: any) {
      if (error.message?.includes('Permission denied')) {
        toast.error(
          'Microphone permission denied. Click the lock icon in your browser address bar to allow access.',
        );
      } else if (error.message?.includes('Device not found')) {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error(
          'Failed to access microphone. Please check your browser settings.',
        );
      }
    }
  };

  const toggleVideo = async () => {
    if (!room) {
      toast.error('Not connected to video server yet. Please wait...');
      return;
    }
    try {
      const newState = !videoEnabled;
      // This triggers the browser permission prompt if not already granted
      await room.localParticipant.setCameraEnabled(newState);
      setVideoEnabled(newState);
      // Force participants update to trigger re-render
      setParticipants((prev) => [...prev]);
      // biome-ignore lint/suspicious/noExplicitAny: Error object handling
    } catch (error: any) {
      if (error.message?.includes('Permission denied')) {
        toast.error(
          'Camera permission denied. Click the lock icon in your browser address bar to allow access.',
        );
      } else if (error.message?.includes('Device not found')) {
        toast.error('No camera found. Please connect a camera.');
      } else {
        toast.error(
          'Failed to access camera. Please check your browser settings.',
        );
      }
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    if (!room) return;

    try {
      setSelectedAudioDevice(deviceId);

      // If audio is currently enabled, switch to the new device
      if (audioEnabled) {
        await room.switchActiveDevice('audioinput', deviceId);
        toast.success('Microphone switched');
      }
    } catch (_error) {
      toast.error('Failed to switch microphone');
    }
  };

  const switchVideoDevice = async (deviceId: string) => {
    if (!room) return;

    try {
      setSelectedVideoDevice(deviceId);

      // If video is currently enabled, switch to the new device
      if (videoEnabled) {
        await room.switchActiveDevice('videoinput', deviceId);
        toast.success('Camera switched');
      }
    } catch (_error) {
      toast.error('Failed to switch camera');
    }
  };

  return {
    room,
    participants,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    refreshDevices,
  };
}
