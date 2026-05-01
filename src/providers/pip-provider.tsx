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

interface PipState {
  streamUrl: string;
  currentTime: number;
  watchUrl: string; // e.g. /watch/abc123
  title: string;
}

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

export function usePipContext() {
  return useContext(PipContext);
}

const VIDEO_ROUTES = ['/watch/', '/live/', '/clip/'];

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
