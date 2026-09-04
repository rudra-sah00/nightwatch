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
  isInterruption,
  isSpeculative,
  nextTurn,
  upsertTurn,
} from '@/features/ask-ai/lib/conversation';
import type {
  AskAiError,
  AskAiMessage,
  AskAiRole,
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
  const [error, setError] = useState<AskAiError | null>(null);

  const activeRef = useRef(false);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);

  const speculativeRef = useRef(false);
  const speakingRef = useRef(false);
  // Turn bookkeeping: content blocks from the same speaker share a key, so the
  // SPECULATIVE and FINAL halves of one reply land in a single bubble instead of
  // two near-identical ones.
  const turnRef = useRef<{ role: AskAiRole | null; sequence: number }>({
    role: null,
    sequence: 0,
  });
  const turnKeyRef = useRef('');

  const setDucked = useCallback((duck: boolean) => {
    window.dispatchEvent(new CustomEvent('ask-ai:duck', { detail: { duck } }));
  }, []);

  /**
   * Pauses or restores background music around a session.
   *
   * The mic stays open for barge-in, so music playing out of the same speakers
   * leaks back in and the service can read it as speech. Ducking to 15% is not
   * enough — playback is suspended outright for the duration.
   */
  const setMusicSuspended = useCallback((suspended: boolean) => {
    window.dispatchEvent(
      new Event(suspended ? 'ask-ai:music-suspend' : 'ask-ai:music-resume'),
    );
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
    // No-op if Ask AI started new music, which clears the suspend flag.
    setMusicSuspended(false);
  }, [setDucked, setMusicSuspended]);

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
        const role: AskAiRole = data.role === 'USER' ? 'user' : 'assistant';
        const turn = nextTurn(turnRef.current, role);
        turnRef.current = { role: turn.role, sequence: turn.sequence };
        turnKeyRef.current = turn.key;
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

      const role: AskAiRole = data.role === 'USER' ? 'user' : 'assistant';
      const turnKey = turnKeyRef.current || `${role}-0`;
      const content = data.content;
      setMessages((prev) => upsertTurn(prev, role, content, turnKey));
    };

    const onAudioOutput = (data: { content?: string }) => {
      if (data.content) playbackRef.current?.enqueue(data.content);
    };

    const onContentEnd = (data: { stopReason?: string; type?: string }) => {
      if (isInterruption({ stopReason: data?.stopReason })) {
        bargeIn();
        return;
      }

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
      activeRef.current = false;
      setState('idle');
    };

    /** Closes the session, optionally routing somewhere afterwards. */
    const closeSession = (url?: string) => {
      void releaseAudio().finally(() => {
        socket.emit('ask-ai:stop');
        setState('idle');
        if (url) router.push(url);
      });
    };

    const onNavigate = (url: string) => closeSession(url);

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
      closeSession(url);
    };

    const onEndSession = () => closeSession();

    // Handing off to the music player ends the conversation, the same way
    // play_content does. Leaving the session open kept the mic hot and the
    // billable Bedrock stream alive while music played into it, which the
    // service could mistake for speech.
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
      } else {
        return;
      }
      closeSession();
    };

    const onPlayPlaylist = (data: { tracks: unknown[]; name: string }) => {
      window.dispatchEvent(
        new CustomEvent('ask-ai:play-playlist', { detail: data }),
      );
      closeSession();
    };

    // Transport control is not a hand-off — the user may keep talking.
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
  }, [socket, router, bargeIn, releaseAudio, setDucked]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    if (!socket?.connected) {
      setError({ code: 'notConnected' });
      return;
    }

    setError(null);
    turnRef.current = { role: null, sequence: 0 };
    turnKeyRef.current = '';

    // Silence background music before the mic opens, not after.
    setMusicSuspended(true);

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
  }, [socket, releaseAudio, setMusicSuspended]);

  const stop = useCallback(async () => {
    await releaseAudio();
    socket?.emit('ask-ai:stop');
    trackEvent('ask_ai_end');
    setState('idle');
  }, [socket, releaseAudio]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    turnRef.current = { role: null, sequence: 0 };
    turnKeyRef.current = '';
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
    error,
    start,
    stop,
    clearHistory,
  };
}
