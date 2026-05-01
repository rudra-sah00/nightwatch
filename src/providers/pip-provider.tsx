'use client';

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
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

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
    if (wasVideoRoute && registeredRef.current && isMobile) {
      const el = videoElRef.current;
      setPip({
        ...registeredRef.current,
        currentTime: el?.currentTime || 0,
      });
      registeredRef.current = null;
      videoElRef.current = null;
    }
  }, [pathname, isMobile, close]);

  // Close PiP when music starts playing
  const { isPlaying: musicPlaying } = useMusicPlayerContext();
  useEffect(() => {
    if (musicPlaying && pip) close();
  }, [musicPlaying, pip, close]);

  // Native PiP on app background (Capacitor only)
  useEffect(() => {
    if (!checkIsMobile()) return;

    const unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
      if (isActive) {
        // Foreground — exit native PiP
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(() => {});
        }
      } else {
        // Background — enter native PiP if a video is registered and playing
        const el = videoElRef.current ?? pipVideoRef.current;
        if (el && !el.paused && el.currentTime > 0) {
          el.requestPictureInPicture?.().catch(() => {});
        }
      }
    });

    return unlisten;
  }, []);

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
  const swipeStartRef = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  // Attach HLS.js for .m3u8 streams
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video || !pip.streamUrl) return;

    if (
      pip.streamUrl.includes('.m3u8') &&
      !video.canPlayType('application/vnd.apple.mpegurl')
    ) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const hls = new Hls({ startPosition: pip.currentTime || -1 });
        hls.loadSource(pip.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hlsRef.current = hls;
      });
    } else {
      video.src = pip.streamUrl;
      video.currentTime = pip.currentTime || 0;
      video.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [pip.streamUrl, pip.currentTime, pipVideoRef]);

  const handleSwipeEnd = () => {
    if (Math.abs(swipeX) > 80) {
      setDismissing(true);
      setSwipeX(swipeX > 0 ? 300 : -300);
      setTimeout(onClose, 250);
    } else {
      setSwipeX(0);
    }
  };

  return (
    <div
      className="fixed z-[9998] shadow-2xl overflow-hidden bg-black"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        right: '0.75rem',
        width: '45vw',
        aspectRatio: '16 / 9',
        borderRadius: '8px',
        transform: swipeX ? `translateX(${swipeX}px)` : undefined,
        opacity: dismissing ? 0 : swipeX ? 1 - Math.abs(swipeX) / 400 : 1,
        transition: dismissing
          ? 'transform 0.25s ease-out, opacity 0.25s ease-out'
          : swipeX
            ? 'none'
            : 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      {/* Loading indicator */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={pipVideoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
        onPlaying={() => setLoaded(true)}
      />
      {/* Tap to navigate back + swipe to dismiss */}
      <button
        type="button"
        onClick={onTap}
        onTouchStart={(e) => {
          swipeStartRef.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          setSwipeX(e.touches[0].clientX - swipeStartRef.current);
        }}
        onTouchEnd={handleSwipeEnd}
        className="absolute inset-0 z-20"
        aria-label="Back to player"
      />
      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <p className="text-[10px] text-white font-semibold truncate">
          {pip.title}
        </p>
      </div>
    </div>
  );
}
