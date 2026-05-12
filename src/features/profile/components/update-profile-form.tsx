'use client';

import { Camera, Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { cn } from '@/lib/utils';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { useUpdateProfileForm } from '../hooks/use-update-profile-form';

/**
 * Profile editing form with avatar upload, inline-editable display name and
 * username, server selection radio group, public profile link sharing, and
 * account deletion danger zone. Auto-saves on blur/Enter via hidden submit.
 */
export function UpdateProfileForm() {
  const t = useTranslations('profile');
  const {
    user,
    logout,
    isUploading,
    displayImage,
    fileInputRef,
    formattedJoinDate,
    handleFileClick,
    handleFileChange,
  } = useProfileOverview();

  const profileForm = useUpdateProfileForm();
  const profileFormRef = useRef<HTMLFormElement>(null);

  const handleCopyPublicLink = async () => {
    try {
      if (!user) return;
      const url = `${window.location.origin}/user/${user.id}`;

      if (checkIsDesktop() && desktopBridge.copyToClipboard) {
        desktopBridge.copyToClipboard(url);
      } else {
        await navigator.clipboard.writeText(url).catch(() => {});
      }
      toast.success(t('updateForm.publicLinkCopied'));
    } catch {
      toast.error(t('updateForm.publicLinkFailed'));
    }
  };

  if (!user) return null;

  return (
    <form
      action={profileForm.action}
      ref={profileFormRef}
      className="space-y-16"
    >
      {/* Main Profile Info Section */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 relative flex flex-col items-center md:items-start md:flex-row gap-6 md:gap-8 min-h-[320px]">
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="overflow-hidden w-48 h-48 md:w-56 md:h-56 border border-border rounded-xl shadow-sm bg-muted transition-transform">
            {displayImage ? (
              <img
                src={displayImage}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-black font-headline uppercase text-muted-foreground">
                  {user.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleFileClick}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 p-3 bg-card border border-border rounded-full shadow-md text-gray-700 hover:text-primary hover:border-blue-300 transition-[color,border-color,opacity] disabled:opacity-50 group/btn focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title={t('updateForm.updatePhoto')}
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
            ) : (
              <Camera className="w-6 h-6 text-foreground" />
            )}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* User Info & Quick Actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full text-center md:text-left mt-2 md:mt-0">
          <div className="space-y-2">
            {/* Display Name - Mobile position (under photo) */}
            <div className="md:hidden text-2xl font-headline font-black text-foreground uppercase">
              <div className="min-w-0 grid grid-cols-1 items-baseline relative group">
                <span className="col-start-1 row-start-1 pointer-events-none text-foreground underline decoration-4 underline-offset-4 font-headline font-bold uppercase truncate group-focus-within:invisible">
                  {profileForm.name || user.name}
                </span>
                <input
                  name="name_mobile"
                  required
                  value={profileForm.name}
                  onChange={(e) => profileForm.setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  onBlur={() => {
                    if (profileForm.hasChanges) {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  className="col-start-1 row-start-1 w-full text-foreground outline-none caret-primary bg-transparent border-none p-0 focus:underline focus:decoration-4 underline-offset-4 focus:bg-accent focus:text-foreground rounded-sm font-headline font-bold uppercase transition-[opacity,background-color,color] opacity-0 focus:opacity-100"
                />
              </div>
            </div>

            {/* Username - Mobile */}
            <div className="md:hidden">
              <div className="mx-auto w-fit max-w-full rounded-lg border border-border bg-muted px-3 py-2">
                <label
                  htmlFor="username_mobile"
                  className="inline-flex w-full max-w-full items-baseline justify-center gap-1"
                >
                  <span className="shrink-0 text-4xl font-black font-headline text-primary leading-none">
                    @
                  </span>
                  <input
                    id="username_mobile"
                    name="username_mobile"
                    value={profileForm.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      profileForm.setUsername(
                        val.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    onBlur={() => {
                      if (
                        profileForm.hasChanges &&
                        profileForm.isAvailable !== false
                      ) {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    className="w-fit min-w-[3ch] max-w-[58vw] bg-transparent border-none p-0 text-center text-4xl font-black font-headline uppercase tracking-tighter text-foreground leading-none outline-none caret-primary"
                    size={Math.min(
                      Math.max(profileForm.username.length, 3),
                      20,
                    )}
                    aria-label={t('updateForm.mobileHandle')}
                  />
                </label>
              </div>
            </div>

            {/* Username Selection Header - Desktop */}
            <h1 className="hidden md:flex w-full min-w-0 overflow-hidden flex-row items-baseline gap-3 text-7xl font-black font-headline uppercase tracking-tighter text-foreground leading-none mb-2 justify-start">
              <span className="inline-flex w-auto max-w-lg items-baseline gap-3 justify-start">
                <span className="shrink-0 text-primary leading-none translate-y-[-4px]">
                  @
                </span>
                <div className="min-w-0 flex-1 overflow-hidden grid grid-cols-1 items-baseline relative group">
                  <span className="col-start-1 row-start-1 block max-w-full pointer-events-none text-left text-foreground underline decoration-8 underline-offset-8 font-black font-headline uppercase truncate group-focus-within:invisible">
                    {profileForm.username ||
                      (profileForm.isPending ? '' : user.username)}
                  </span>
                  <input
                    name="username"
                    id="username"
                    value={profileForm.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      profileForm.setUsername(
                        val.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    onBlur={() => {
                      if (
                        profileForm.hasChanges &&
                        profileForm.isAvailable !== false
                      ) {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    className="col-start-1 row-start-1 w-full text-left text-foreground outline-none caret-primary bg-transparent border-none p-0 focus:underline focus:decoration-8 underline-offset-8 focus:bg-accent focus:text-foreground rounded-sm font-black font-headline uppercase leading-none tracking-tighter transition-[opacity,background-color,color] opacity-0 focus:opacity-100 placeholder:text-transparent"
                    aria-label={t('updateForm.username')}
                  />
                </div>
              </span>
            </h1>
            <input type="hidden" name="username" value={profileForm.username} />

            {/* Display Name - Desktop position (grouped with username) */}
            <div className="hidden md:block text-xl md:text-2xl font-headline font-bold text-foreground w-full max-w-lg uppercase">
              <div className="min-w-0 grid grid-cols-1 items-baseline relative group">
                <label
                  htmlFor="name"
                  className="col-start-1 row-start-1 pointer-events-none text-foreground underline decoration-4 underline-offset-4 font-headline font-bold uppercase truncate group-focus-within:invisible"
                >
                  {profileForm.name || user.name}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  value={profileForm.name}
                  onChange={(e) => profileForm.setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  onBlur={() => {
                    if (profileForm.hasChanges) {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  className="col-start-1 row-start-1 w-full text-foreground outline-none caret-primary bg-transparent border-none p-0 focus:underline focus:decoration-4 underline-offset-4 focus:bg-accent focus:text-foreground rounded-sm font-headline font-bold uppercase transition-[opacity,background-color,color] opacity-0 focus:opacity-100 placeholder:text-transparent"
                  aria-label={t('updateForm.displayName')}
                />
                <input type="hidden" name="name" value={profileForm.name} />
              </div>
            </div>

            <div className="w-full min-w-0 text-base md:text-lg font-headline font-medium text-foreground md:max-w-lg uppercase">
              <span className="opacity-80 flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 md:justify-start md:flex-nowrap">
                <span className="min-w-0 truncate">{user.email}</span>
                <span className="shrink-0">
                  • {t('updateForm.joined', { date: formattedJoinDate })}
                </span>
              </span>
            </div>

            {/* Username Check Feedback */}
            {profileForm.username !== user?.username &&
              profileForm.username.length > 0 && (
                <p
                  className={cn(
                    'text-sm font-bold uppercase font-headline flex items-center gap-2',
                    profileForm.isAvailable === false
                      ? 'text-[red-600]'
                      : profileForm.isAvailable
                        ? 'text-emerald-600'
                        : 'text-foreground/50',
                  )}
                >
                  {profileForm.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {profileForm.username.length < 3
                    ? t('updateForm.minChars')
                    : profileForm.isAvailable === false
                      ? t('updateForm.alreadyTaken')
                      : profileForm.isAvailable
                        ? t('updateForm.available')
                        : t('updateForm.checking')}
                </p>
              )}
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 md:self-start md:ml-auto">
            {profileForm.isPending && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground font-headline font-bold uppercase border-2 border-border  animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('updateForm.saving')}</span>
              </div>
            )}
            <Button
              type="button"
              variant="neo-outline"
              size="default"
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="gap-2 shrink-0 md:self-start self-center w-full max-w-xs md:w-auto min-w-[140px]"
              title={t('updateForm.signOut')}
            >
              <LogOut className="w-5 h-5 stroke-[3px]" />
              <span className="hidden sm:inline">
                {t('updateForm.signOut')}
              </span>
            </Button>
            <button
              type="submit"
              className="hidden pointer-events-none"
              disabled={
                profileForm.isPending ||
                (profileForm.username.length > 0 &&
                  profileForm.username.length < 3) ||
                profileForm.isAvailable === false
              }
            >
              {t('updateForm.saveChanges')}
            </button>
          </div>
        </div>
      </section>

      {/* Public Profile Sharing */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            {t('publicIdentity.title')}
          </h2>
          <p className="text-sm font-bold uppercase font-headline text-foreground/40">
            {t('publicIdentity.description')}
          </p>
          <div className="bg-background border border-border px-4 py-2 mt-4 font-mono text-xs md:text-sm font-semibold break-all text-foreground/60 select-all rounded-md">
            {user.id}
          </div>
        </div>

        <Button
          type="button"
          variant="neo-outline"
          size="default"
          onClick={handleCopyPublicLink}
          className="w-full md:w-auto"
        >
          {t('publicIdentity.copyLink')}
        </Button>
      </section>

      {/* Server Selection */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-black font-headline uppercase tracking-tighter text-foreground">
            {t('serverSelection.title')}
          </h2>
          {profileForm.isPending && (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div
          role="radiogroup"
          aria-label={t('serverSelection.ariaLabel')}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {[
            {
              id: 's1' as const,
              label: 'Server 2',
              sub: t('serverSelection.standard'),
            },
            {
              id: 's1' as const,
              label: t('serverSelection.balanced'),
              sub: t('serverSelection.performance'),
            },
          ].map((s) => {
            const isSelected = profileForm.preferredServer === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  profileForm.setPreferredServer(s.id);
                  // Immediate save for server selection
                  setTimeout(() => profileFormRef.current?.requestSubmit(), 0);
                }}
                className={cn(
                  'flex flex-col items-start gap-1 p-6 border rounded-lg transition-[background-color,border-color,color,box-shadow] text-left w-full shadow-sm cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'bg-card text-card-foreground border-border hover:border-primary/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md',
                )}
              >
                <span className="font-bold text-xl font-headline uppercase tracking-tight">
                  {s.label}
                </span>
                <span className="text-sm uppercase opacity-90 font-medium tracking-wide">
                  {s.sub}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="hidden"
          name="preferredServer"
          value={profileForm.preferredServer}
        />
      </section>

      {/* Danger Zone */}
      <section className="bg-card border border-neo-red/30 rounded-xl shadow-sm p-8 mt-16 group relative overflow-hidden transition-colors hover:bg-neo-red/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black font-headline uppercase tracking-tighter text-neo-red mb-2">
              {t('dangerZone.title')}
            </h2>
            <p className="text-neo-red font-bold font-headline uppercase tracking-widest text-sm opacity-80">
              {t('dangerZone.description')}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => profileForm.setShowDeleteDialog(true)}
            variant="neo-red"
            className="w-full md:w-auto shrink-0"
          >
            {t('dangerZone.deleteAccount')}
          </Button>
        </div>
      </section>

      <AlertDialog
        open={profileForm.showDeleteDialog}
        onOpenChange={profileForm.setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neo-red">
              {t('dangerZone.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dangerZone.dialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8">
            <AlertDialogCancel
              type="button"
              onClick={() => profileForm.setShowDeleteDialog(false)}
              disabled={profileForm.isDeleting}
            >
              {t('dangerZone.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                profileForm.handleDeleteAccount();
              }}
              disabled={profileForm.isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {profileForm.isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dangerZone.erasing')}
                </>
              ) : (
                t('dangerZone.confirmDelete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
