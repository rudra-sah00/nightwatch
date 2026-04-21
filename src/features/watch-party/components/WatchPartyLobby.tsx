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
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { useDesktopApp } from '@/hooks/use-desktop-app';
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
  const { isBrowser, openInDesktopApp } = useDesktopApp();
  const t = useTranslations('party.lobby');

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-background border-4 border-border p-8  text-center space-y-6">
          <Monitor className="w-16 h-16 text-foreground mx-auto" />
          <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            {t('desktopOnly')}
          </h1>
          <p className="text-foreground font-medium leading-relaxed uppercase text-sm">
            {t('desktopOnlyDesc')}
          </p>
          <Button
            type="button"
            variant="neo-outline"
            onClick={() => router.push('/home')}
            className="w-full py-4 tracking-widest uppercase font-black border-4"
          >
            {t('goHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !roomPreview && !roomNotFound) {
    return <WatchPartyLoading message={t('loadingRoom')} />;
  }

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-background border-4 border-border p-8  text-center space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
          <div className="w-20 h-20 bg-neo-red border-4 border-border flex items-center justify-center mx-auto ">
            <Users className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            {t('roomNotFound')}
          </h1>
          <p className="text-foreground font-medium uppercase text-sm leading-relaxed">
            {t('roomNotFoundDesc')}
          </p>
          <Button
            type="button"
            variant="neo-outline"
            onClick={() => router.push('/home')}
            className="w-full py-4 tracking-widest uppercase font-black border-4"
          >
            {t('backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-background border-4 border-border p-8  motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none">
          {/* 3-step indicator - Neobrutalist style */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-emerald-500 border-2 border-border flex items-center justify-center ">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] text-foreground font-black font-headline uppercase">
                {t('sent')}
              </span>
            </div>
            <div className="w-12 h-1 bg-primary mb-6" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-neo-yellow border-4 border-border flex items-center justify-center animate-pulse motion-reduce:animate-none ">
                <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-foreground" />
              </div>
              <span className="text-[10px] text-foreground font-black font-headline uppercase">
                {t('waiting')}
              </span>
            </div>
            <div className="w-12 h-1 bg-primary/20 mb-6" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-background border-2 border-border flex items-center justify-center">
                <Users className="w-5 h-5 text-foreground/40" />
              </div>
              <span className="text-[10px] text-foreground/40 font-black font-headline uppercase">
                {t('joining')}
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-black font-headline uppercase tracking-tighter text-center mb-2">
            {t('waitingForApproval')}
          </h2>
          <p className="text-foreground font-medium uppercase text-xs text-center leading-relaxed mb-8">
            {t('waitingForApprovalDesc')}
          </p>
          <Button
            type="button"
            variant="neo-outline"
            onClick={onCancelRequest || onLeave}
            className="w-full py-3 tracking-widest uppercase font-black border-4"
          >
            {t('cancelRequest')}
          </Button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-background border-4 border-border p-8  text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
          <div className="w-20 h-20 bg-neo-red border-4 border-border flex items-center justify-center mx-auto mb-6 ">
            <UserMinus className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-black font-headline uppercase tracking-tighter mb-2">
            {t('requestDeclined')}
          </h2>
          <p className="text-foreground font-medium uppercase text-sm leading-relaxed mb-8">
            {t('requestDeclinedDesc')}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="neo-outline"
              onClick={() => window.location.reload()}
              className="w-full py-4 tracking-widest uppercase font-black border-4"
            >
              {t('tryAgain')}
            </Button>
            <Button
              variant="neo-ghost"
              onClick={() => router.push('/home')}
              className="w-full text-foreground/60 hover:text-foreground text-[10px] tracking-widest underline underline-offset-4"
            >
              {t('goHome')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (roomPreview) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-background border-4 border-border  motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none overflow-hidden">
          {/* Header */}
          <div className="bg-neo-yellow border-b-4 border-border p-6 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-black font-headline uppercase text-foreground border-2 border-border bg-background px-3 py-1 mb-4">
              <div className="w-2 h-2 rounded-full bg-neo-yellow animate-pulse motion-reduce:animate-none" />
              {t('liveWatchParty')}
            </div>
            <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
              {t('youreInvited')}
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
                  {t('seasonEpisode', {
                    season: roomPreview.season,
                    episode: roomPreview.episode ?? 0,
                  })}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-black font-headline uppercase text-foreground">
                  <Crown className="w-4 h-4 text-neo-blue" />
                  <span className="truncate max-w-[120px]">
                    {roomPreview.hostName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black font-headline uppercase text-foreground">
                  <Users className="w-4 h-4 text-neo-blue" />
                  <span>
                    {t('watching', { count: roomPreview.memberCount })}
                  </span>
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
                    {t('yourDisplayName')}
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40 pointer-events-none" />
                    <input
                      id="guestName"
                      type="text"
                      value={guestName}
                      onChange={(e) => onGuestNameChange(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      maxLength={30}
                      className="w-full pl-10 pr-4 py-3 bg-background border-4 border-border text-foreground outline-none font-bold placeholder:text-foreground/40 transition-colors focus:bg-neo-yellow relative"
                    />
                  </div>
                </div>

                {/* Captcha for guest users */}
                {onCaptchaVerify ? (
                  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-reduce:animate-none">
                    <p className="text-[10px] font-black font-headline uppercase text-foreground/60 mb-2 text-center">
                      {t('securityCheck')}
                    </p>
                    <div className="mt-2">
                      <Captcha onVerify={onCaptchaVerify} onError={() => {}} />
                    </div>
                    {captchaToken ? (
                      <p className="text-xs text-emerald-600 font-black font-headline uppercase text-center mt-2 flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> {t('verified')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              <Button
                type="button"
                variant="neo-outline"
                onClick={onJoin}
                disabled={
                  isLoading ||
                  (!user && !guestName.trim()) ||
                  (!user && !captchaToken)
                }
                className="w-full py-4 tracking-widest uppercase font-black border-4"
              >
                {isLoading ? t('requesting') : t('requestToJoin')}
              </Button>

              {isBrowser ? (
                <Button
                  type="button"
                  variant="neo-outline"
                  onClick={() => openInDesktopApp()}
                  className="w-full py-4 tracking-widest uppercase font-black bg-neo-yellow text-primary-foreground border-4 hover:bg-neo-yellow/80"
                >
                  <Monitor className="w-5 h-5 mr-2" />
                  {t('openInDesktopApp')}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="neo-ghost"
                onClick={() => router.push('/home')}
                className="w-full text-foreground/60 hover:text-foreground text-[10px] tracking-widest underline underline-offset-4"
              >
                {t('cancel')}
              </Button>
            </div>

            {error ? (
              <div className="p-4 bg-neo-red border-4 border-border text-primary-foreground">
                <p className="text-sm font-black font-headline uppercase leading-tight">
                  {error}
                </p>
                {errorCode ? (
                  <p className="text-[8px] uppercase tracking-widest mt-1 opacity-80">
                    {t('errorCode', { code: errorCode })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
