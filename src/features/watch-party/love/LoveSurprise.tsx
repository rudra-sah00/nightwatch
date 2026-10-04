'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerControls } from '@/features/watch/player/context/PlayerContext';
import { onLoveAnswer, onLoveSurprise } from '../room/services/watch-party.api';
import type { RTMMessage } from '../room/types/rtm-messages';
import { LOVE_VIDEO_URL, type LoveAnswer, useLoveSurprise } from './store';

/**
 * TEMPORARY — the `/my-girl` surprise.
 *
 * Plays the film for everyone in the party, then asks a question with two
 * buttons. Whoever answers is announced to the whole room live.
 *
 * 3D only. The film plays on the cinema screen (`SceneInterior` textures from
 * the <video> here) and the room lights follow it. A viewer in 2D sees nothing,
 * and leaving 3D ends it for them.
 *
 * The party's own movie or live stream is paused for the duration and resumed
 * afterwards — see the pause effect below.
 */
const ANSWER_LINGER_MS = 9000;

interface LoveSurpriseProps {
  userId?: string;
  userName?: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** 3D shows the film on the theatre screen instead of over the player. */
  is3D: boolean;
}

export function LoveSurprise({
  userId,
  userName,
  rtmSendMessage,
  is3D,
}: LoveSurpriseProps) {
  const phase = useLoveSurprise((s) => s.phase);
  const answer = useLoveSurprise((s) => s.answer);
  const { start, toQuestion, setAnswer, reset, setVideoEl } =
    useLoveSurprise.getState();
  const { videoRef } = usePlayerControls();
  const filmRef = useRef<HTMLVideoElement | null>(null);

  // Read inside the RTM callback, which is bound once.
  const is3DRef = useRef(is3D);
  is3DRef.current = is3D;

  // Peers triggering or answering. 3D only — a 2D viewer sees nothing.
  useEffect(() => {
    const offStart = onLoveSurprise(({ userId: from }) => {
      if (is3DRef.current) start(from);
    });
    const offAnswer = onLoveAnswer(({ userName: name, answer: a }) => {
      if (is3DRef.current) setAnswer(name || 'Someone', a);
    });
    return () => {
      offStart();
      offAnswer();
    };
  }, [start, setAnswer]);

  // Leaving 3D ends the surprise for this viewer.
  useEffect(() => {
    if (!is3D) reset();
  }, [is3D, reset]);

  // Never leave the store pointing at a <video> that has unmounted.
  useEffect(() => () => reset(), [reset]);

  const active = phase !== 'idle';

  /*
    Pause the movie / live stream while the surprise runs, and resume after.

    Everyone pauses their own copy at once. On the host this also broadcasts a
    pause through `useWatchPartyHostSync` (it listens to the element's events),
    and the host's resume broadcasts a play, so the party stays in step. A live
    stream jumps back to the live edge rather than resuming minutes behind.

    Also muted, in case the host is in 2D and their sync resumes this copy
    mid-film — the film should never be talked over.
  */
  useEffect(() => {
    if (!active) return;
    const party = videoRef.current;
    if (!party) return;
    const wasPlaying = !party.paused;
    const wasMuted = party.muted;
    party.pause();
    party.muted = true;
    return () => {
      party.muted = wasMuted;
      if (!wasPlaying) return;
      const live = !Number.isFinite(party.duration);
      if (live && party.seekable.length > 0) {
        party.currentTime = party.seekable.end(party.seekable.length - 1) - 1;
      }
      party.play().catch(() => {
        // Autoplay with sound refused; the player's own play button still works.
      });
    };
  }, [active, videoRef]);

  /*
    Whether the film is actually rolling. Until it is, a loading screen covers
    the theatre — otherwise typing the command looks like nothing happened while
    a 24 MB file downloads and the screen keeps showing the paused movie.
  */
  const [filmRolling, setFilmRolling] = useState(false);
  useEffect(() => {
    if (phase !== 'playing') setFilmRolling(false);
  }, [phase]);

  // Start (or restart) the film each time the surprise begins.
  useEffect(() => {
    if (phase !== 'playing') return;
    const film = filmRef.current;
    if (!film) return;
    film.currentTime = 0;
    film.play().catch(() => {
      // Autoplay refused (should not happen: the film is muted). Skip ahead.
      toQuestion();
    });
  }, [phase, toQuestion]);

  // The question needs a cursor, and walking in 3D holds the pointer lock.
  useEffect(() => {
    if (phase === 'question' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase]);

  // Clear the announcement after a while.
  useEffect(() => {
    if (phase !== 'answered') return;
    const t = setTimeout(reset, ANSWER_LINGER_MS);
    return () => clearTimeout(t);
  }, [phase, reset]);

  const bindFilm = useCallback(
    (el: HTMLVideoElement | null) => {
      filmRef.current = el;
      setVideoEl(el);
    },
    [setVideoEl],
  );

  const respond = useCallback(
    (a: LoveAnswer) => {
      if (!userId) return;
      const name = userName || 'Someone';
      rtmSendMessage?.({
        type: 'LOVE_ANSWER',
        userId,
        userName: name,
        answer: a,
      });
      setAnswer(name, a);
    },
    [userId, userName, rtmSendMessage, setAnswer],
  );

  return (
    <>
      {/*
        3D only, and full size BENEATH the opaque theatre canvas — the same trick
        the party's own <video> relies on. A 1px or opacity-0 element can stop
        the browser compositing frames, and VideoTexture only updates on frames
        that were composited, so the cinema screen would freeze.
      */}
      {is3D ? (
        <video
          ref={bindFilm}
          src={LOVE_VIDEO_URL}
          muted
          playsInline
          preload="auto"
          onEnded={toQuestion}
          // Missing file (e.g. a deploy without the media) — go straight to the card.
          onError={toQuestion}
          onPlaying={() => setFilmRolling(true)}
          aria-label="A short film made for you"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
        />
      ) : null}

      {active ? (
        <button
          type="button"
          onClick={reset}
          className="absolute right-4 top-4 z-[60] rounded-full bg-black/60 px-3 py-1 text-xs text-white/70 hover:text-white"
        >
          Close ✕
        </button>
      ) : null}

      {phase === 'playing' && !filmRolling ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#1a0710] to-black"
        >
          <div
            aria-hidden
            className="h-12 w-12 animate-spin rounded-full border-4 border-pink-300/20 border-t-pink-400"
          />
          <p className="font-serif text-2xl italic text-pink-50">
            Loading something special… 💗
          </p>
        </div>
      ) : null}

      {phase === 'question' ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="love-question"
            className="mx-4 max-w-md rounded-3xl border border-pink-300/30 bg-gradient-to-b from-[#3a0f22] to-[#1a0710] px-8 py-10 text-center shadow-[0_0_80px_rgba(255,60,120,0.35)]"
          >
            <div aria-hidden className="mb-4 text-5xl">
              💌
            </div>
            <h2
              id="love-question"
              className="font-serif text-2xl italic leading-snug text-pink-50"
            >
              Will you watch every movie with me forever?
            </h2>
            <div className="mt-8 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => respond('yes')}
                className="rounded-full bg-pink-500 px-7 py-2.5 font-semibold text-white shadow-lg shadow-pink-500/40 transition hover:scale-105 hover:bg-pink-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => respond('also-yes')}
                className="rounded-full bg-rose-600 px-7 py-2.5 font-semibold text-white shadow-lg shadow-rose-600/40 transition hover:scale-105 hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200"
              >
                Also yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === 'answered' && answer ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
        >
          <HeartRain />
          <div className="rounded-3xl bg-black/50 px-10 py-8 text-center backdrop-blur-sm">
            <div aria-hidden className="text-6xl">
              💖
            </div>
            <p className="mt-3 font-serif text-3xl italic text-pink-50">
              {answer.userName} said{' '}
              {answer.answer === 'yes' ? 'YES' : 'ALSO YES'}!
            </p>
            <p className="mt-2 text-sm text-pink-200/80">Forever it is. 🍿</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Hearts falling across the player. Pure CSS, removed with the banner. */
function HeartRain() {
  const hearts = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes love-fall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(25deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .love-heart { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {hearts.map((i) => (
        <span
          key={i}
          className="love-heart absolute top-0"
          style={{
            left: `${(i * 37) % 100}%`,
            fontSize: `${18 + ((i * 13) % 22)}px`,
            animation: `love-fall ${4 + ((i * 7) % 5)}s linear ${(i * 0.31) % 4}s infinite`,
          }}
        >
          {['💖', '💗', '💕', '❤️'][i % 4]}
        </span>
      ))}
    </div>
  );
}
