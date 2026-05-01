'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';
import { useMobileDetection } from '@/features/watch/player/hooks/useMobileDetection';

/**
 * Serialised snapshot of a playing video captured when the user navigates
 * away from a watch route. Used to resume playback in the floating PiP player.
 */
interface PipState {
  /** HLS manifest URL of the stream being played. */
  streamUrl: string;
  /** Playback position (seconds) at the moment PiP was activated. */
  currentTime: number;
  /** Original watch route (e.g. `/watch/abc123`) for tap-to-return navigation. */
  watchUrl: string; // e.g. /watch/abc123
  /** Content title displayed in the PiP overlay. */
  title: string;
}

/**
 * Context value exposed by {@link PipProvider} to child components.
 *
 * Watch-page players call {@link register} on mount and {@link unregister} on
 * unmount. The provider automatically activates PiP when the user navigates
 * away from a video route on mobile.
 */
interface PipContextValue {
  /** Register the current watch page so PiP can activate on navigation away */
  register: (
    data: Omit<PipState, 'currentTime'>,
    videoEl: HTMLVideoElement,
  ) => void;
  /** Unregister (called when WatchVODPlayer unmounts on the same route, e.g. episode change) */
  unregister: () => void;
  /** Close PiP programmatically */
  close: () => void;
  /** Whether PiP is currently showing */
  isActive: boolean;
}

const PipContext = createContext<PipContextValue | null>(null);

/**
 * Returns the current {@link PipContextValue}, or `null` if used outside a
 * {@link PipProvider}. Watch-page players use this to register/unregister
 * themselves for cross-route PiP.
 *
 * @returns The PiP context value or `null`.
 */
export function usePipContext() {
  return useContext(PipContext);
}

const VIDEO_ROUTES = ['/watch/', '/live/', '/clip/'];

/**
 * Global Picture-in-Picture provider for cross-route video continuity on mobile.
 *
 * **Route-change detection** — watches `pathname` via `usePathname()`. When the
 * user navigates *away* from a video route (`/watch/`, `/live/`, `/clip/`) and
 * a player was registered (playing, `currentTime > 0`), PiP activates. When
 * navigating *to* a video route, any existing PiP is closed to avoid conflicts.
 *
 * **Music conflict resolution** — listens to `isPlaying` from
 * {@link useMusicPlayerContext}. If music starts while PiP is active, PiP is
 * automatically closed so audio streams don't overlap.
 *
 * Renders a {@link PipPlayer} floating mini-player when PiP is active on mobile.
 *
 * @param props.children - Application tree that can access the PiP context.
 */
export function PipProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useMobileDetection();
  const pathname = usePathname();
  const router = useRouter();
  const [pip, setPip] = useState<PipState | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const registeredRef = useRef<Omit<PipState, 'currentTime'> | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const close = useCallback(() => {
    setPip(null);
    registeredRef.current = null;
    videoElRef.current = null;
  }, []);

  const register = useCallback(
    (data: Omit<PipState, 'currentTime'>, videoEl: HTMLVideoElement) => {
      registeredRef.current = data;
      videoElRef.current = videoEl;
    },
    [],
  );

  const unregister = useCallback(() => {
    registeredRef.current = null;
    videoElRef.current = null;
  }, []);

  // When pathname changes, decide whether to activate or close PiP
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === pathname) return;

    const isVideoRoute = VIDEO_ROUTES.some((r) => pathname.startsWith(r));

    // Navigating TO a video/live/clip route → close any existing PiP
    if (isVideoRoute) {
      close();
      return;
    }

    // Navigating AWAY from a video route with a registered player → activate PiP
    const wasVideoRoute = VIDEO_ROUTES.some((r) => prev.startsWith(r));
    if (
      wasVideoRoute &&
      registeredRef.current &&
      videoElRef.current &&
      isMobile
    ) {
      const el = videoElRef.current;
      if (!el.paused && el.currentTime > 0) {
        setPip({
          ...registeredRef.current,
          currentTime: el.currentTime,
        });
      }
      registeredRef.current = null;
      videoElRef.current = null;
    }
  }, [pathname, isMobile, close]);

  // Close PiP when music starts playing
  const { isPlaying: musicPlaying } = useMusicPlayerContext();
  useEffect(() => {
    if (musicPlaying && pip) close();
  }, [musicPlaying, pip, close]);

  const ctx: PipContextValue = { register, unregister, close, isActive: !!pip };

  return (
    <PipContext value={ctx}>
      {children}
      {pip && isMobile ? (
        <PipPlayer
          pip={pip}
          onClose={close}
          onTap={() => router.push(pip.watchUrl)}
          pipVideoRef={pipVideoRef}
        />
      ) : null}
    </PipContext>
  );
}

/**
 * Floating mini-player rendered when cross-route PiP is active.
 *
 * Positioned fixed in the bottom-right corner (respecting safe-area insets),
 * it plays the captured stream URL and seeks to the saved `currentTime` on
 * `loadedmetadata`. Provides a tap-to-return overlay and a close button.
 *
 * @param props.pip - Serialised {@link PipState} with stream URL, time, and title.
 * @param props.onClose - Closes the PiP player.
 * @param props.onTap - Navigates back to the original watch route.
 * @param props.pipVideoRef - Ref attached to the `<video>` element for external control.
 */
function PipPlayer({
  pip,
  onClose,
  onTap,
  pipVideoRef,
}: {
  pip: PipState;
  onClose: () => void;
  onTap: () => void;
  pipVideoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div
      className="fixed z-[9998] shadow-2xl overflow-hidden"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        right: '0.75rem',
        width: '45vw',
        aspectRatio: '16 / 9',
        borderRadius: '8px',
      }}
    >
      <video
        ref={pipVideoRef}
        src={pip.streamUrl}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.currentTime = pip.currentTime;
        }}
      />
      {/* Tap to navigate back */}
      <button
        type="button"
        onClick={onTap}
        className="absolute inset-0 z-10"
        aria-label="Back to player"
      />
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-1 right-1 z-20 p-1 bg-black/60 rounded-full"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>
      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <p className="text-[10px] text-white font-semibold truncate">
          {pip.title}
        </p>
      </div>
    </div>
  );
}
