import {
  Check,
  Crown,
  Loader2,
  Monitor,
  UserCircle,
  UserMinus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Captcha } from '@/components/ui/captcha';
import type { User } from '@/types';
import type { RoomPreview } from '../room/types';

interface WatchPartyLobbyProps {
  roomPreview: RoomPreview | null;
  isLoading: boolean;
  error: string | null;
  errorCode?: string | null;
  requestStatus: 'idle' | 'pending' | 'rejected' | 'joined';
  roomNotFound: boolean;
  user: User | undefined | null;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  onJoin: () => void;
  onLeave: () => void;
  onCancelRequest?: () => void;
  // Captcha for guest users
  captchaToken?: string | null;
  onCaptchaVerify?: (token: string) => void;
  /** Block access on mobile screens */
  isMobile?: boolean;
}

export function WatchPartyLobby({
  roomPreview,
  isLoading,
  error,
  errorCode,
  requestStatus,
  roomNotFound,
  user,
  guestName,
  onGuestNameChange,
  onJoin,
  onLeave,
  onCancelRequest,
  captchaToken,
  onCaptchaVerify,
  isMobile = false,
}: WatchPartyLobbyProps) {
  const router = useRouter();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Monitor className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Desktop Only</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Watch Party is only available on desktop. Please open this link on a
          computer to watch together.
        </p>
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (isLoading && !roomPreview && !roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Loading room…</p>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-sm w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Room Not Found
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This watch party has ended or the link is no longer valid.
          </p>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-lg border border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 3-step indicator */}
          <div className="flex items-center justify-center gap-2 mb-7">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] text-primary font-medium">Sent</span>
            </div>
            <div className="w-10 h-px bg-primary/30 mb-3" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <span className="text-[10px] text-primary font-medium">
                Waiting
              </span>
            </div>
            <div className="w-10 h-px bg-border mb-3" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Joining
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 text-center">
            Waiting for Approval
          </h2>
          <p className="text-muted-foreground text-sm text-center leading-relaxed">
            The host has been notified. You'll join automatically once approved.
          </p>
          <button
            type="button"
            onClick={onCancelRequest || onLeave}
            className="mt-6 w-full py-2.5 text-sm text-danger/80 hover:text-danger border border-danger/20 hover:border-danger/40 rounded-xl transition-colors"
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-lg border border-border text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
            <UserMinus className="w-7 h-7 text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Request Declined</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The host has declined your request to join this party.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="w-full py-2.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roomPreview) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-6 shadow-xl border border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Watch Party
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              You're Invited
            </h1>
          </div>

          {/* Content info */}
          <div className="bg-secondary/30 rounded-xl p-4 mb-5 border border-border/50">
            <h2 className="font-semibold text-foreground text-lg leading-tight">
              {roomPreview.title}
            </h2>
            {roomPreview.season ? (
              <p className="text-sm text-muted-foreground mt-0.5">
                Season {roomPreview.season} &middot; Episode{' '}
                {roomPreview.episode}
              </p>
            ) : null}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Crown className="w-3.5 h-3.5 text-host flex-shrink-0" />
                <span className="truncate max-w-[120px]">
                  {roomPreview.hostName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{roomPreview.memberCount} watching</span>
              </div>
            </div>
          </div>

          {!user ? (
            <>
              <div className="mb-4">
                <label
                  htmlFor="guestName"
                  className="block text-sm font-medium mb-1.5"
                >
                  Your Display Name
                </label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="guestName"
                    type="text"
                    value={guestName}
                    onChange={(e) => onGuestNameChange(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={30}
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  />
                </div>
              </div>

              {/* Captcha for guest users — animates in after name is entered */}
              {guestName.trim() && onCaptchaVerify ? (
                <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Complete the security check to continue
                  </p>
                  <Captcha
                    onVerify={onCaptchaVerify}
                    onError={() => {
                      // Reset captcha on error
                    }}
                  />
                  {captchaToken ? (
                    <p className="text-xs text-success text-center mt-1 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Verified
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            onClick={onJoin}
            disabled={
              isLoading ||
              (!user && !guestName.trim()) ||
              (!user && !captchaToken)
            }
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Requesting…
              </>
            ) : (
              'Request to Join'
            )}
          </button>

          {error ? (
            <div className="mt-3 rounded-lg bg-danger/10 border border-danger/20 p-3 text-center">
              <p className="text-danger text-sm">{error}</p>
              {errorCode ? (
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-50">
                  Code: {errorCode}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => router.push('/home')}
            className="w-full py-2 text-muted-foreground mt-3 hover:text-foreground transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
