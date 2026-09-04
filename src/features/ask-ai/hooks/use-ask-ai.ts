'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AudioCapture,
  startAudioCapture,
} from '@/features/ask-ai/lib/audio-capture';
import {
  type AudioPlayback,
  startAudioPlayback,
} from '@/features/ask-ai/lib/audio-playback';
import {
  appendMessage,
  isInterruption,
  isSpeculative,
} from '@/features/ask-ai/lib/conversation';
import type {
  AskAiError,
  AskAiMessage,
  AskAiState,
} from '@/features/ask-ai/types';
import { reportError, trackEvent } from '@/lib/analytics';
import { useSocket } from '@/providers/socket-provider';

/**
 * Ask AI hook — bidirectional voice session against Nova Sonic.
 *
 * Uses the main app socket (via SocketProvider) for auth and reconnection.
 * Ask AI events are namespaced (ask-ai:*) so there is no conflict with
 * friends/presence/calls on the same connection.
 *
 * Audio lives in ./lib/audio-capture and ./lib/audio-playback; this hook owns
 * the session lifecycle, the transcript state and the tool-event wiring.
 */

/** Maps a getUserMedia / startup failure onto a translatable code. */
function toStartError(err: unknown): AskAiError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      return { code: 'micDenied' };
    }
    if (
      err.name === 'NotFoundError' ||
      err.name === 'NotReadableError' ||
      err.name === 'OverconstrainedError'
    ) {
      return { code: 'micUnavailable' };
    }
  }
  // Capacitor WebViews without a mic bridge throw on the undefined API itself.
  if (err instanceof TypeError) return { code: 'micUnavailable' };
  return {
    code: 'startFailed',
    detail: err instanceof Error ? err.message : String(err),
  };
}

export function useAskAi() {
  const router = useRouter();
  const { socket } = useSocket();

  const [state, setState] = useState<AskAiState>('idle');
  const [messages, setMessages] = useState<AskAiMessage[]>([]);
  const [liveUserText, setLiveUserText] = useState('');
  const [liveAssistantText, setLiveAssistantText] = useState('');
  const [error, setError] = useState<AskAiError | null>(null);

  const activeRef = useRef(false);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);

  const roleRef = useRef<'USER' | 'ASSISTANT' | ''>('');
  const speculativeRef = useRef(false);
  const speakingRef = useRef(false);
  const pendingUserRef = useRef('');
  const pendingAssistantRef = useRef('');

  const setDucked = useCallback((duck: boolean) => {
    window.dispatchEvent(new CustomEvent('ask-ai:duck', { detail: { duck } }));
  }, []);

  /** Moves whichever turn just ended out of the live caption and into history. */
  const finalizeTurn = useCallback(() => {
    if (roleRef.current === 'USER' && pendingUserRef.current) {
      const content = pendingUserRef.current;
      pendingUserRef.current = '';
      setLiveUserText('');
      setMessages((prev) => appendMessage(prev, 'user', content));
    } else if (roleRef.current === 'ASSISTANT' && pendingAssistantRef.current) {
      const content = pendingAssistantRef.current;
      pendingAssistantRef.current = '';
      setLiveAssistantText('');
      setMessages((prev) => appendMessage(prev, 'assistant', content));
    }
  }, []);

  /** Cuts assistant audio immediately, keeping the mic open. */
  const bargeIn = useCallback(() => {
    playbackRef.current?.flush();
    if (speakingRef.current) {
      speakingRef.current = false;
      setDucked(false);
    }
    if (activeRef.current) setState('listening');
  }, [setDucked]);

  const releaseAudio = useCallback(async () => {
    activeRef.current = false;
    const capture = captureRef.current;
    const playback = playbackRef.current;
    captureRef.current = null;
    playbackRef.current = null;
    await Promise.allSettled([capture?.close(), playback?.close()]);
    if (speakingRef.current) {
      speakingRef.current = false;
      setDucked(false);
    }
  }, [setDucked]);

  // --- Socket events ---
  // Depends on `socket` directly: SocketProvider starts at null and connects
  // asynchronously, so reading it from a ref meant that opening this page
  // before the socket was ready left the listeners permanently unregistered.
  useEffect(() => {
    if (!socket) return;

    const onContentStart = (data: {
      type?: string;
      role?: string;
      additionalModelFields?: string;
    }) => {
      if (data.type === 'TEXT') {
        roleRef.current = (data.role as 'USER' | 'ASSISTANT') || '';
        speculativeRef.current =
          data.role === 'ASSISTANT'
            ? isSpeculative(data.additionalModelFields)
            : false;
      } else if (data.type === 'AUDIO' && data.role === 'ASSISTANT') {
        speakingRef.current = true;
        setState('speaking');
        setDucked(true);
      }
    };

    const onTextOutput = (data: { role?: string; content?: string }) => {
      if (!data.content) return;

      // Nova Sonic reports mid-turn barge-in as a sentinel payload.
      if (isInterruption({ content: data.content })) {
        bargeIn();
        return;
      }

      if (roleRef.current === 'USER') {
        pendingUserRef.current = data.content;
        setLiveUserText(data.content);
      } else if (roleRef.current === 'ASSISTANT') {
        pendingAssistantRef.current = data.content;
        // Only the SPECULATIVE draft streams into the live caption; the FINAL
        // copy is what gets committed to history on contentEnd.
        if (speculativeRef.current) setLiveAssistantText(data.content);
      }
    };

    const onAudioOutput = (data: { content?: string }) => {
      if (data.content) playbackRef.current?.enqueue(data.content);
    };

    const onContentEnd = (data: { stopReason?: string; type?: string }) => {
      if (isInterruption({ stopReason: data?.stopReason })) {
        finalizeTurn();
        bargeIn();
        return;
      }

      finalizeTurn();

      if (speakingRef.current) {
        speakingRef.current = false;
        setDucked(false);
        if (activeRef.current) setState('listening');
      }
    };

    const onError = (data: unknown) => {
      const detail = typeof data === 'string' ? data : JSON.stringify(data);
      setError({ code: 'serverError', detail });
      reportError(`[AskAI] ${detail}`);
    };

    const endLocally = () => {
      finalizeTurn();
      activeRef.current = false;
      setState('idle');
    };

    /** Tool-driven navigation: close the session, then route. */
    const leaveTo = (url: string) => {
      finalizeTurn();
      void releaseAudio().finally(() => {
        socket.emit('ask-ai:stop');
        setState('idle');
        router.push(url);
      });
    };

    const onNavigate = (url: string) => leaveTo(url);

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
      leaveTo(url);
    };

    const onEndSession = () => {
      finalizeTurn();
      void releaseAudio().finally(() => {
        socket.emit('ask-ai:stop');
        setState('idle');
      });
    };

    const onPlayMusic = (data: { track?: unknown; songId?: string }) => {
      if (data.track) {
        window.dispatchEvent(
          new CustomEvent('ask-ai:play-music', {
            detail: { track: data.track },
          }),
        );
      } else if (data.songId) {
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

    const onMusicControl = (data: { action: string }) => {
      window.dispatchEvent(
        new CustomEvent('ask-ai:music-control', { detail: data }),
      );
    };

    socket.on('ask-ai:contentStart', onContentStart);
    socket.on('ask-ai:textOutput', onTextOutput);
    socket.on('ask-ai:audioOutput', onAudioOutput);
    socket.on('ask-ai:contentEnd', onContentEnd);
    socket.on('ask-ai:error', onError);
    socket.on('ask-ai:streamComplete', endLocally);
    socket.on('ask-ai:sessionClosed', endLocally);
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
      socket.off('ask-ai:streamComplete', endLocally);
      socket.off('ask-ai:sessionClosed', endLocally);
      socket.off('ask-ai:navigate', onNavigate);
      socket.off('ask-ai:playMusic', onPlayMusic);
      socket.off('ask-ai:playPlaylist', onPlayPlaylist);
      socket.off('ask-ai:endSession', onEndSession);
      socket.off('ask-ai:musicControl', onMusicControl);
      socket.off('ask-ai:openManga', onOpenManga);
    };
  }, [socket, router, bargeIn, finalizeTurn, releaseAudio, setDucked]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    if (!socket?.connected) {
      setError({ code: 'notConnected' });
      return;
    }

    setError(null);
    setLiveUserText('');
    setLiveAssistantText('');
    pendingUserRef.current = '';
    pendingAssistantRef.current = '';

    try {
      // Surface a denied permission before prompting, which iOS Capacitor
      // WebViews otherwise fail on silently.
      if (navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          if (perm.state === 'denied') {
            setError({ code: 'micDenied' });
            setState('idle');
            return;
          }
        } catch {
          // Not queryable for microphone in some browsers — continue.
        }
      }

      playbackRef.current = await startAudioPlayback();

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

      activeRef.current = true;
      setState('listening');
      trackEvent('ask_ai_start');

      // The mic stays open while the assistant speaks — that is what lets the
      // service detect an interruption. Echo cancellation keeps it from
      // hearing itself through the speakers.
      captureRef.current = await startAudioCapture((base64) => {
        if (activeRef.current) socket.emit('ask-ai:audioInput', base64);
      });
    } catch (err) {
      const mapped = toStartError(err);
      setError(mapped);
      reportError(`[AskAI] Start failed: ${mapped.detail ?? mapped.code}`);
      await releaseAudio();
      setState('idle');
    }
  }, [socket, releaseAudio]);

  const stop = useCallback(async () => {
    finalizeTurn();
    await releaseAudio();
    socket?.emit('ask-ai:stop');
    trackEvent('ask_ai_end');
    setState('idle');
  }, [socket, finalizeTurn, releaseAudio]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setLiveUserText('');
    setLiveAssistantText('');
    pendingUserRef.current = '';
    pendingAssistantRef.current = '';
  }, []);

  // Release the mic if the page unmounts mid-session.
  useEffect(() => {
    return () => {
      if (activeRef.current) void releaseAudio();
    };
  }, [releaseAudio]);

  return {
    state,
    messages,
    liveUserText,
    liveAssistantText,
    error,
    start,
    stop,
    clearHistory,
  };
}
