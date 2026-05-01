'use client';

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Plus,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDuration } from '@/features/friends/call/call.utils';
import { InviteSpotlight } from '@/features/friends/call/InviteSpotlight';
import { PeerAvatar } from '@/features/friends/call/PeerAvatar';
import { useCall } from '@/features/friends/hooks/use-call';

/**
 * Floating call overlay that renders in three visual states:
 *
 * 1. **Incoming** — compact card (top-right) showing the caller's avatar/name
 *    with accept (green) and reject (red) buttons.
 * 2. **Outgoing** — same compact card with mute toggle and end-call button;
 *    displays "Calling…" status text.
 * 3. **Active** — compact card showing call duration, mute/video/invite/end
 *    controls. When remote video is active the card expands to 320×224 px and
 *    auto-hides controls after 3 s (re-shown on hover).
 *
 * **Expanded mode** — tapping the compact card (not a button) opens a
 * full-screen 80 vw × 80 vh popup with a participant grid, local/remote video
 * swap, and an {@link InviteSpotlight} dialog for adding friends to the call.
 *
 * **Draggable** — the compact card supports pointer-based dragging (clamped to
 * viewport bounds, respecting `--electron-titlebar-height`). A 4 px dead-zone
 * distinguishes drags from taps.
 *
 * Entry/exit uses CSS `animate-in` / opacity+scale transitions (300 ms).
 *
 * @returns The call overlay element, or `null` when no call is active.
 */
export function CallOverlay() {
  const {
    callState,
    peer,
    participants,
    isMuted,
    isVideoOn,
    isRemoteVideoOn,
    remoteVideoRef,
    localVideoRef,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    inviteFriend,
  } = useCall();

  const t = useTranslations('common.friends.call');

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [swapped, setSwapped] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    w: number;
    h: number;
    dragging: boolean;
  } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      w: rect.width,
      h: rect.height,
      dragging: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.dragging && Math.abs(dx) + Math.abs(dy) > 4) {
      dragRef.current.dragging = true;
    }
    if (dragRef.current.dragging) {
      const { w, h } = dragRef.current;
      const titlebarH =
        Number.parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--electron-titlebar-height')
            .trim(),
          10,
        ) || 0;
      setDragPos({
        x: Math.max(
          0,
          Math.min(window.innerWidth - w, dragRef.current.origX + dx),
        ),
        y: Math.max(
          titlebarH,
          Math.min(window.innerHeight - h, dragRef.current.origY + dy),
        ),
      });
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (dragRef.current?.dragging) {
      requestAnimationFrame(() => {
        dragRef.current = null;
      });
    } else if (dragRef.current) {
      // It was a tap, not a drag — expand
      dragRef.current = null;
      setExpanded(true);
    }
  }, []);

  const isActive = callState !== 'idle' && !!peer;
  const hasRemoteVideo = callState === 'active' && isRemoteVideoOn;
  const allPeers = peer
    ? [peer, ...participants.filter((p) => p.id !== peer.id)]
    : [];

  useEffect(() => {
    if (isActive) {
      setExiting(false);
      requestAnimationFrame(() => setVisible(true));
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive && visible) {
      setExiting(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setExiting(false);
        setExpanded(false);
        setShowInvite(false);
        setDragPos(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, visible]);

  useEffect(() => {
    if (!hasRemoteVideo) {
      setShowControls(true);
      return;
    }
    setShowControls(true);
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [hasRemoteVideo]);

  if (!visible && !isActive) return null;

  // Expanded full popup view
  if (expanded) {
    return (
      <div
        className={`fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10010] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          exiting
            ? 'opacity-0 scale-95'
            : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
      >
        <div className="w-[80vw] h-[80vh] bg-black/40 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <p className="text-white font-headline font-bold text-lg">
                {callState === 'active'
                  ? formatDuration(callDuration)
                  : t('outgoing')}
              </p>
              <p className="text-white/50 text-xs font-headline uppercase tracking-widest">
                {t('participants', { count: allPeers.length })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Participant area */}
          {allPeers.length <= 1 ? (
            <div className="relative mx-5 my-4 flex-1 rounded-2xl overflow-hidden bg-white/5">
              {/* Main video (remote by default, local when swapped) */}
              <div
                ref={swapped ? localVideoRef : remoteVideoRef}
                className={`absolute inset-0 ${(swapped ? isVideoOn : hasRemoteVideo) ? 'block' : 'hidden'}`}
              />
              {!(swapped ? isVideoOn : hasRemoteVideo) && peer && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <PeerAvatar
                    peer={
                      swapped
                        ? { id: 'local', name: t('you'), photo: null }
                        : peer
                    }
                    size={120}
                  />
                  <p className="text-white text-xl font-headline font-bold">
                    {swapped ? t('you') : peer.name}
                  </p>
                </div>
              )}
              {/* PiP small video (local by default, remote when swapped) */}
              {callState === 'active' && (
                <button
                  type="button"
                  onClick={() => setSwapped((s) => !s)}
                  className="absolute bottom-3 right-3 w-36 h-24 rounded-xl overflow-hidden border-2 border-white/20 bg-black/60 cursor-pointer hover:border-white/40 transition-colors"
                >
                  <div
                    ref={swapped ? remoteVideoRef : localVideoRef}
                    className={`absolute inset-0 ${(swapped ? hasRemoteVideo : isVideoOn) ? 'block' : 'hidden'}`}
                  />
                  {!(swapped ? hasRemoteVideo : isVideoOn) && (
                    <div className="flex items-center justify-center h-full">
                      <PeerAvatar
                        peer={
                          swapped
                            ? (peer ?? { id: 'local', name: '', photo: null })
                            : { id: 'local', name: t('you'), photo: null }
                        }
                        size={32}
                      />
                    </div>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div
              className={`grid gap-4 px-5 py-4 flex-1 content-center ${
                allPeers.length + 1 <= 2
                  ? 'grid-cols-2'
                  : allPeers.length + 1 <= 4
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {/* Local user */}
              <div className="relative flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-6 overflow-hidden">
                <div
                  ref={localVideoRef}
                  className={`absolute inset-0 ${isVideoOn ? 'block' : 'hidden'}`}
                />
                {!isVideoOn && (
                  <>
                    <PeerAvatar
                      peer={{ id: 'local', name: t('you'), photo: null }}
                      size={80}
                    />
                    <p className="text-white text-sm font-headline font-bold">
                      {t('you')}
                    </p>
                  </>
                )}
              </div>
              {allPeers.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-6"
                >
                  <PeerAvatar peer={p} size={80} />
                  <p className="text-white text-sm font-headline font-bold truncate max-w-[120px]">
                    {p.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 px-5 pb-5">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted
                  ? 'bg-red-500/30 text-red-400'
                  : 'bg-white/15 text-white'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            {callState === 'active' && (
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOn
                    ? 'bg-white/15 text-white'
                    : 'bg-white/15 text-white/40'
                }`}
              >
                {isVideoOn ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </button>
            )}
            {callState === 'active' && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/15 text-white/60 hover:text-white transition-colors"
                aria-label={t('invite')}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={endCall}
              className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invite Friend Popup */}
        {showInvite && (
          <InviteSpotlight
            onClose={() => setShowInvite(false)}
            onInvite={(p) => {
              inviteFriend(p);
              setShowInvite(false);
            }}
            existing={allPeers}
          />
        )}
      </div>
    );
  }

  // Compact overlay (top-right)
  return (
    <>
      <div
        className={`fixed z-[10000] transition-opacity duration-300 ease-out ${
          !dragPos ? 'right-4' : ''
        } ${
          exiting
            ? 'opacity-0 scale-95'
            : isActive
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95'
        }`}
        style={
          dragPos
            ? { left: dragPos.x, top: dragPos.y, touchAction: 'none' }
            : {
                top: 'calc(var(--electron-titlebar-height, 0px) + env(safe-area-inset-top, 0px) + 0.75rem)',
                touchAction: 'none',
              }
        }
      >
        <section
          aria-label={t('callOverlay')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(true);
            }
          }}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => hasRemoteVideo && setShowControls(false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`bg-black/30 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-left transition-all duration-300 cursor-grab active:cursor-grabbing select-none ${
            hasRemoteVideo ? 'w-80 h-56' : 'w-72'
          }`}
        >
          <div
            ref={remoteVideoRef}
            className={`absolute inset-0 rounded-2xl overflow-hidden ${hasRemoteVideo ? 'block' : 'hidden'}`}
          />

          <div
            className={`relative z-10 flex flex-col h-full transition-opacity duration-200 ${hasRemoteVideo && !showControls ? 'opacity-0' : 'opacity-100'}`}
          >
            {peer && (
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                {!hasRemoteVideo && <PeerAvatar peer={peer} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-headline font-bold text-sm truncate text-white">
                      {peer.name}
                    </p>
                    {participants.length > 0 && (
                      <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">
                        +{participants.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 font-headline uppercase tracking-widest">
                    {callState === 'incoming' && t('incoming')}
                    {callState === 'outgoing' && t('outgoing')}
                    {callState === 'active' && formatDuration(callDuration)}
                  </p>
                </div>
              </div>
            )}

            <div
              className={`flex items-center justify-center gap-3 px-4 ${hasRemoteVideo ? 'mt-auto' : ''} pb-4`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="toolbar"
            >
              {callState === 'incoming' && (
                <>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label={t('decline')}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                    aria-label={t('accept')}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </>
              )}
              {(callState === 'outgoing' || callState === 'active') && (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/15 text-white'}`}
                    aria-label={isMuted ? t('unmute') : t('mute')}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  {callState === 'active' && (
                    <button
                      type="button"
                      onClick={toggleVideo}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isVideoOn ? 'bg-white/15 text-white' : 'bg-white/15 text-white/40'}`}
                      aria-label={isVideoOn ? t('cameraOn') : t('cameraOff')}
                    >
                      {isVideoOn ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <VideoOff className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {callState === 'active' && (
                    <button
                      type="button"
                      onClick={() => setShowInvite(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 text-white/60 hover:text-white transition-colors"
                      aria-label={t('invite')}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={endCall}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label={t('end')}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {showInvite && (
        <InviteSpotlight
          onClose={() => setShowInvite(false)}
          onInvite={(p) => {
            inviteFriend(p);
            setShowInvite(false);
          }}
          existing={allPeers}
        />
      )}
    </>
  );
}
