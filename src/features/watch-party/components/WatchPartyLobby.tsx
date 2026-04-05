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
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import type { User } from '@/types';
import type { RoomPreview } from '../room/types';
import { WatchPartyLoading } from './WatchPartyLoading';

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
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }

    const message = errorCode ? `${error} (Code: ${errorCode})` : error;
    if (lastErrorRef.current !== message) {
      lastErrorRef.current = message;
      toast.error(message);
    }
  }, [error, errorCode]);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-4 border-border p-8  text-center space-y-6">
          <Monitor className="w-16 h-16 text-foreground mx-auto" />
          <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            Desktop Only
          </h1>
          <p className="text-foreground font-medium leading-relaxed uppercase text-sm">
            Watch Party is only available on desktop. Please open this link on a
            computer to watch together.
          </p>
          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={() => router.push('/home')}
            className="w-full py-4 bg-[#ffcc00] text-foreground border-4 border-border tracking-widest"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !roomPreview && !roomNotFound) {
    return <WatchPartyLoading message="Loading room…" />;
  }

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-border p-8  text-center space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
          <div className="w-20 h-20 bg-[#e63b2e] border-4 border-border flex items-center justify-center mx-auto ">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            Room Not Found
          </h1>
          <p className="text-foreground font-medium uppercase text-sm leading-relaxed">
            This watch party has ended or the link is no longer valid.
          </p>
          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={() => router.push('/home')}
            className="w-full py-4 bg-[#ffcc00] text-foreground border-4 border-border tracking-widest"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-border p-8  motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none">
          {/* 3-step indicator - Neobrutalist style */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-emerald-500 border-2 border-border flex items-center justify-center ">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-foreground font-black font-headline uppercase">
                Sent
              </span>
            </div>
            <div className="w-12 h-1 bg-[#1a1a1a] mb-6" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-[#ffcc00] border-4 border-border flex items-center justify-center animate-pulse motion-reduce:animate-none ">
                <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-foreground" />
              </div>
              <span className="text-[10px] text-foreground font-black font-headline uppercase">
                Waiting
              </span>
            </div>
            <div className="w-12 h-1 bg-[#1a1a1a]/20 mb-6" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-background border-2 border-border flex items-center justify-center">
                <Users className="w-5 h-5 text-foreground/40" />
              </div>
              <span className="text-[10px] text-foreground/40 font-black font-headline uppercase">
                Joining
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-black font-headline uppercase tracking-tighter text-center mb-2">
            Waiting for Approval
          </h2>
          <p className="text-foreground font-medium uppercase text-xs text-center leading-relaxed mb-8">
            The host has been notified. You'll join automatically once approved.
          </p>
          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={onCancelRequest || onLeave}
            className="w-full py-3 bg-white text-[#e63b2e] border-2 border-border hover:bg-[#e63b2e] hover:text-white"
          >
            Cancel Request
          </Button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-border p-8  text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
          <div className="w-20 h-20 bg-[#e63b2e] border-4 border-border flex items-center justify-center mx-auto mb-6 ">
            <UserMinus className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black font-headline uppercase tracking-tighter mb-2">
            Request Declined
          </h2>
          <p className="text-foreground font-medium uppercase text-sm leading-relaxed mb-8">
            The host has declined your request to join this party.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="neo-base"
              size="none"
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-[#ffcc00] text-foreground border-4 border-border tracking-widest"
            >
              Try Again
            </Button>
            <Button
              variant="neo-ghost"
              onClick={() => router.push('/home')}
              className="w-full text-foreground/60 hover:text-foreground text-[10px] tracking-widest underline underline-offset-4"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (roomPreview) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-border  motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none overflow-hidden">
          {/* Header */}
          <div className="bg-[#ffcc00] border-b-4 border-border p-6 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-black font-headline uppercase text-foreground border-2 border-border bg-white px-3 py-1 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse motion-reduce:animate-none" />
              Live Watch Party
            </div>
            <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
              You're Invited
            </h1>
          </div>

          <div className="p-6 space-y-6">
            {/* Content info */}
            <div className="bg-background border-4 border-border p-5 ">
              <h2 className="font-black font-headline uppercase text-xl leading-tight text-foreground">
                {roomPreview.title}
              </h2>
              {roomPreview.season ? (
                <p className="text-xs font-bold font-headline uppercase text-foreground/60 mt-1">
                  Season {roomPreview.season} &middot; Episode{' '}
                  {roomPreview.episode}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-black font-headline uppercase text-foreground">
                  <Crown className="w-4 h-4 text-[#0055ff]" />
                  <span className="truncate max-w-[120px]">
                    {roomPreview.hostName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black font-headline uppercase text-foreground">
                  <Users className="w-4 h-4 text-[#0055ff]" />
                  <span>{roomPreview.memberCount} watching</span>
                </div>
              </div>
            </div>

            {!user ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="guestName"
                    className="block text-xs font-black font-headline uppercase mb-2 text-foreground"
                  >
                    Your Display Name
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40 pointer-events-none" />
                    <input
                      id="guestName"
                      type="text"
                      value={guestName}
                      onChange={(e) => onGuestNameChange(e.target.value)}
                      placeholder="ENTER YOUR NAME"
                      maxLength={30}
                      className="w-full pl-10 pr-4 py-3 bg-white border-4 border-border text-foreground outline-none font-bold placeholder:text-foreground/40 transition-colors focus:bg-[#ffcc00] relative"
                    />
                  </div>
                </div>

                {/* Captcha for guest users */}
                {onCaptchaVerify ? (
                  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-reduce:animate-none">
                    <p className="text-[10px] font-black font-headline uppercase text-foreground/60 mb-2 text-center">
                      Security Check
                    </p>
                    <div className="mt-2">
                      <Captcha onVerify={onCaptchaVerify} onError={() => {}} />
                    </div>
                    {captchaToken ? (
                      <p className="text-xs text-emerald-600 font-black font-headline uppercase text-center mt-2 flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> Verified
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              <Button
                type="button"
                variant="neo-base"
                size="none"
                onClick={onJoin}
                disabled={
                  isLoading ||
                  (!user && !guestName.trim()) ||
                  (!user && !captchaToken)
                }
                className="w-full py-4 bg-[#ffcc00] text-foreground border-4 border-border tracking-widest opacity-100 disabled:opacity-50"
              >
                {isLoading ? 'Requesting…' : 'Request to Join'}
              </Button>

              <Button
                type="button"
                variant="neo-ghost"
                onClick={() => router.push('/home')}
                className="w-full text-foreground/60 hover:text-foreground text-[10px] tracking-widest underline underline-offset-4"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
