'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

/**
 * Ask AI hook — follows official AWS Nova Sonic sample pattern exactly.
 *
 * Protocol: init → promptStart → systemPrompt → audioStart → audioInput... → stop
 * Playback: AudioWorklet with 1-second initial buffer (from official sample)
 */

type State = 'idle' | 'listening' | 'speaking';

export function useAskAi() {
  const { socket } = useSocket();
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

  // --- Socket event handlers (matching official main.js) ---
  useEffect(() => {
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
      // Full cleanup: stop mic, close audio, end session, then navigate
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
      socket?.emit('ask-ai:stop');
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

    return () => {
      socket.off('ask-ai:contentStart', onContentStart);
      socket.off('ask-ai:textOutput', onTextOutput);
      socket.off('ask-ai:audioOutput', onAudioOutput);
      socket.off('ask-ai:contentEnd', onContentEnd);
      socket.off('ask-ai:error', onError);
      socket.off('ask-ai:streamComplete', onStreamComplete);
      socket.off('ask-ai:sessionClosed', onSessionClosed);
      socket.off('ask-ai:navigate', onNavigate);
    };
  }, [socket, base64ToFloat32, router]);

  // --- Start (matching official startStreaming + initializeSession) ---
  const start = useCallback(async () => {
    if (!socket?.connected || activeRef.current) return;
    setError(null);
    setTranscript('');
    setUserTranscript('');

    try {
      // 1. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 2. Set up audio capture context (use native sample rate, resample to 16kHz when sending)
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      // 3. Set up playback context
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playCtxRef.current = playCtx;

      // 4. Initialize session on server (matching official: init → promptStart → systemPrompt → audioStart)
      await new Promise<void>((resolve, reject) => {
        socket.emit(
          'ask-ai:init',
          (res: { success: boolean; error?: string }) => {
            if (res?.success) {
              resolve();
            } else {
              reject(new Error(res?.error || 'Init failed'));
            }
          },
        );
      });

      socket.emit('ask-ai:promptStart');
      socket.emit('ask-ai:systemPrompt');
      socket.emit('ask-ai:audioStart');

      // 5. Wait for audioReady
      await new Promise<void>((resolve) => {
        socket.once('ask-ai:audioReady', resolve);
        // Timeout fallback
        setTimeout(resolve, 2000);
      });

      activeRef.current = true;
      setState('listening');

      // 6. Start streaming mic audio (matching official: ScriptProcessor → base64 → socket)
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(512, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!activeRef.current || speakingRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        // Downsample to 16kHz if needed
        const ratio = audioCtx.sampleRate / 16000;
        const numSamples = Math.round(input.length / ratio);
        const pcm = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          pcm[i] =
            Math.max(-1, Math.min(1, input[Math.round(i * ratio)])) * 0x7fff;
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
      setError(err instanceof Error ? err.message : 'Failed to start');
      setState('idle');
      activeRef.current = false;
    }
  }, [socket]);

  // --- Stop (matching official stopStreaming) ---
  const stop = useCallback(() => {
    activeRef.current = false;

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
    socket?.emit('ask-ai:stop');
    setState('idle');
  }, [socket]);

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
