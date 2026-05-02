'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

/**
 * Ask AI hook — follows official AWS Nova Sonic sample pattern exactly.
 *
 * Uses the main app socket (via SocketProvider) for auth and reconnection.
 * Ask AI events are namespaced (ask-ai:*) so there's no conflict with
 * friends/presence/calls on the same connection.
 */

type State = 'idle' | 'listening' | 'speaking';

const TARGET_SAMPLE_RATE = 16000;
const isFirefox =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('firefox');

export function useAskAi() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [transcript, setTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef(0);

  // Playback refs
  const playCtxRef = useRef<AudioContext | null>(null);

  const socketRef = useRef<ReturnType<typeof useSocket>['socket']>(null);

  const roleRef = useRef('');
  const displayAssistantTextRef = useRef(false);
  const speakingRef = useRef(false);

  // --- Base64 ↔ Float32 conversion (from official sample) ---
  const base64ToFloat32 = useCallback((b64: string): Float32Array => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }, []);

  // --- Use the main app socket (already authenticated via SocketProvider) ---
  // A dedicated socket would need its own session validation and reconnection
  // handling. The main socket already handles auth, force_logout, and reconnection.
  // Ask AI events are namespaced (ask-ai:*) so there's no conflict.
  const { socket: appSocket } = useSocket();

  useEffect(() => {
    socketRef.current = appSocket;
  }, [appSocket]);

  // --- Socket event handlers (matching official main.js) ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onContentStart = (data: {
      type?: string;
      role?: string;
      additionalModelFields?: string;
    }) => {
      if (data.type === 'TEXT') {
        roleRef.current = data.role || '';
        if (data.role === 'ASSISTANT' && data.additionalModelFields) {
          try {
            const fields = JSON.parse(data.additionalModelFields);
            displayAssistantTextRef.current =
              fields.generationStage === 'SPECULATIVE';
          } catch {
            displayAssistantTextRef.current = false;
          }
        }
      } else if (data.type === 'AUDIO' && data.role === 'ASSISTANT') {
        speakingRef.current = true;
        setState('speaking');
        window.dispatchEvent(
          new CustomEvent('ask-ai:duck', { detail: { duck: true } }),
        );
      }
    };

    const onTextOutput = (data: { role?: string; content?: string }) => {
      if (!data.content) return;
      if (roleRef.current === 'USER') {
        setUserTranscript(data.content);
      } else if (
        roleRef.current === 'ASSISTANT' &&
        displayAssistantTextRef.current
      ) {
        setTranscript(data.content);
      }
    };

    const onAudioOutput = (data: { content?: string }) => {
      if (!data.content || !playCtxRef.current) return;
      const samples = base64ToFloat32(data.content);
      playQueueRef.current.push(samples);

      // Schedule playback
      const ctx = playCtxRef.current;
      if (nextPlayTimeRef.current < ctx.currentTime) {
        nextPlayTimeRef.current = ctx.currentTime + 0.05;
      }
      while (playQueueRef.current.length > 0) {
        const chunk = playQueueRef.current.shift();
        if (!chunk) break;
        const buf = ctx.createBuffer(1, chunk.length, 24000);
        buf.getChannelData(0).set(chunk);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buf.duration;
      }
    };

    const onContentEnd = () => {
      if (speakingRef.current) {
        speakingRef.current = false;
        window.dispatchEvent(
          new CustomEvent('ask-ai:duck', { detail: { duck: false } }),
        );
        if (activeRef.current) {
          setState('listening');
        }
      }
    };

    const onError = (data: unknown) => {
      const msg = typeof data === 'string' ? data : JSON.stringify(data);
      setError(msg);
    };

    const onStreamComplete = () => {
      activeRef.current = false;
      setState('idle');
    };

    const onSessionClosed = () => {
      activeRef.current = false;
      setState('idle');
    };

    const onNavigate = (url: string) => {
      activeRef.current = false;
      playQueueRef.current = [];
      nextPlayTimeRef.current = 0;
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close();
      playCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      socket.emit('ask-ai:stop');
      router.push(url);
    };

    const onPlayMusic = (data: { track?: unknown; songId?: string }) => {
      if (data.track) {
        // Full track data from backend — play directly, no API call needed
        window.dispatchEvent(
          new CustomEvent('ask-ai:play-music', {
            detail: { track: data.track },
          }),
        );
      } else if (data.songId) {
        // Fallback: fetch song data
        window.dispatchEvent(
          new CustomEvent('ask-ai:play-music', {
            detail: { songId: data.songId },
          }),
        );
      }
    };

    const onPlayPlaylist = (data: { tracks: unknown[]; name: string }) => {
      window.dispatchEvent(
        new CustomEvent('ask-ai:play-playlist', { detail: data }),
      );
    };

    const onEndSession = () => {
      activeRef.current = false;
      playQueueRef.current = [];
      nextPlayTimeRef.current = 0;
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close();
      playCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      socket.emit('ask-ai:stop');
      setState('idle');
    };

    const onMusicControl = (data: { action: string }) => {
      window.dispatchEvent(
        new CustomEvent('ask-ai:music-control', { detail: data }),
      );
    };

    const onOpenManga = (data: {
      titleId?: number;
      chapterId?: number;
      url?: string;
    }) => {
      const url =
        data.url ||
        (data.chapterId
          ? `/manga/chapter/${data.chapterId}`
          : `/manga/title/${data.titleId}`);
      // Stop session and navigate
      activeRef.current = false;
      playQueueRef.current = [];
      nextPlayTimeRef.current = 0;
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close();
      playCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      socket.emit('ask-ai:stop');
      router.push(url);
    };

    socket.on('ask-ai:contentStart', onContentStart);
    socket.on('ask-ai:textOutput', onTextOutput);
    socket.on('ask-ai:audioOutput', onAudioOutput);
    socket.on('ask-ai:contentEnd', onContentEnd);
    socket.on('ask-ai:error', onError);
    socket.on('ask-ai:streamComplete', onStreamComplete);
    socket.on('ask-ai:sessionClosed', onSessionClosed);
    socket.on('ask-ai:navigate', onNavigate);
    socket.on('ask-ai:playMusic', onPlayMusic);
    socket.on('ask-ai:playPlaylist', onPlayPlaylist);
    socket.on('ask-ai:endSession', onEndSession);
    socket.on('ask-ai:musicControl', onMusicControl);
    socket.on('ask-ai:openManga', onOpenManga);

    return () => {
      socket.off('ask-ai:contentStart', onContentStart);
      socket.off('ask-ai:textOutput', onTextOutput);
      socket.off('ask-ai:audioOutput', onAudioOutput);
      socket.off('ask-ai:contentEnd', onContentEnd);
      socket.off('ask-ai:error', onError);
      socket.off('ask-ai:streamComplete', onStreamComplete);
      socket.off('ask-ai:sessionClosed', onSessionClosed);
      socket.off('ask-ai:navigate', onNavigate);
      socket.off('ask-ai:playMusic', onPlayMusic);
      socket.off('ask-ai:playPlaylist', onPlayPlaylist);
      socket.off('ask-ai:endSession', onEndSession);
      socket.off('ask-ai:musicControl', onMusicControl);
      socket.off('ask-ai:openManga', onOpenManga);
    };
  }, [base64ToFloat32, router]);

  // --- Start (matching official startStreaming + initializeSession) ---
  const start = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected || activeRef.current) return;
    setError(null);
    setTranscript('');
    setUserTranscript('');

    try {
      // 1. Check mic permission first (required for iOS Capacitor WebView)
      if (navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          if (perm.state === 'denied') {
            setError('Microphone access denied. Please enable it in Settings.');
            setState('idle');
            return;
          }
        } catch {
          // permissions.query not supported for microphone in some browsers — continue
        }
      }

      // 2. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Set up audio capture context — capture at 16kHz directly (matching official sample)
      //    Firefox doesn't allow AudioContext sampleRate different from device, so use native + downsample
      const audioCtx = isFirefox
        ? new AudioContext()
        : new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioCtxRef.current = audioCtx;
      const samplingRatio = audioCtx.sampleRate / TARGET_SAMPLE_RATE;

      // 3. Set up playback context
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playCtxRef.current = playCtx;

      // 4. Initialize session on server (matching official: init → promptStart → systemPrompt → audioStart)
      await new Promise<void>((resolve, reject) => {
        socket.emit(
          'ask-ai:init',
          (res: { success: boolean; error?: string }) => {
            if (res?.success) resolve();
            else reject(new Error(res?.error || 'Init failed'));
          },
        );
      });

      socket.emit('ask-ai:promptStart');
      socket.emit('ask-ai:systemPrompt');
      socket.emit('ask-ai:audioStart');

      // 5. Start streaming immediately — no audioReady wait (matching official sample)
      activeRef.current = true;
      setState('listening');

      // 6. Start streaming mic audio (matching official: ScriptProcessor → base64 → socket)
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(512, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!activeRef.current) return;
        const input = e.inputBuffer.getChannelData(0);

        // On Chrome: already at 16kHz, no downsample needed. On Firefox: downsample.
        const numSamples = Math.round(input.length / samplingRatio);
        const pcm = new Int16Array(numSamples);
        if (isFirefox) {
          for (let i = 0; i < numSamples; i++) {
            pcm[i] =
              Math.max(-1, Math.min(1, input[Math.round(i * samplingRatio)])) *
              0x7fff;
          }
        } else {
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
          }
        }

        // Convert to base64
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        socket.emit('ask-ai:audioInput', btoa(binary));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      let msg: string;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        msg =
          'Microphone access denied. Please allow microphone in your device Settings.';
      } else if (
        err instanceof TypeError ||
        (err instanceof Error && err.message.includes('undefined'))
      ) {
        msg =
          'Microphone is not available on this device. Try using the app from a browser or check your permissions in Settings.';
      } else {
        msg = err instanceof Error ? err.message : 'Failed to start';
      }
      setError(msg);
      setState('idle');
      activeRef.current = false;
    }
  }, []);

  // --- Stop (matching official stopStreaming) ---
  const stop = useCallback(() => {
    activeRef.current = false;

    // Release audio ducking if AI was speaking
    if (speakingRef.current) {
      speakingRef.current = false;
      window.dispatchEvent(
        new CustomEvent('ask-ai:duck', { detail: { duck: false } }),
      );
    }

    // Barge-in: clear playback buffer
    playQueueRef.current = [];
    nextPlayTimeRef.current = 0;

    // Disconnect mic
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;

    // Close audio contexts
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    playCtxRef.current?.close();
    playCtxRef.current = null;

    // Stop mic tracks
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;

    // Tell server to stop
    socketRef.current?.emit('ask-ai:stop');
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        stop();
      }
    };
  }, [stop]);

  return { state, transcript, userTranscript, error, start, stop };
}
