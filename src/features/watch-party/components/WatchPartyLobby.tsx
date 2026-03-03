import { Crown, Loader2, Monitor, UserMinus, Users } from 'lucide-react';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Room Not Found</h1>
        <p className="text-muted-foreground">
          This watch party room doesn't exist or has ended.
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

  if (requestStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-lg border border-border text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Waiting for Host Approval</h2>
          <p className="text-muted-foreground">
            The host has been notified of your request.
          </p>
          <button
            type="button"
            onClick={onCancelRequest || onLeave}
            className="mt-6 text-sm text-danger hover:opacity-80"
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
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-lg border border-border text-center">
          <UserMinus className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Request Rejected</h2>
          <p className="text-muted-foreground">
            The host has declined your request to join.
          </p>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (roomPreview) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            Watch Party
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            You're invited to watch together!
          </p>

          <div className="bg-secondary/30 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-foreground">
              {roomPreview.title}
            </h2>
            {roomPreview.season ? (
              <p className="text-sm text-muted-foreground">
                Season {roomPreview.season} Episode {roomPreview.episode}
              </p>
            ) : null}
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Crown className="w-4 h-4 text-host" />
              <span>Hosted by {roomPreview.hostName}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{roomPreview.memberCount} watching</span>
            </div>
          </div>

          {!user ? (
            <>
              <div className="mb-4">
                <label
                  htmlFor="guestName"
                  className="block text-sm font-medium mb-1"
                >
                  Your Name
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => onGuestNameChange(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Captcha for guest users - only show after name is entered */}
              {guestName.trim() && onCaptchaVerify ? (
                <div className="mb-4">
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
                    <p className="text-xs text-success text-center mt-1">
                      ✓ Verified
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
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Requesting...
              </>
            ) : (
              'Request to Join'
            )}
          </button>

          {error ? (
            <div className="mt-3 text-center">
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
            className="w-full py-2 text-muted-foreground mt-3 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
