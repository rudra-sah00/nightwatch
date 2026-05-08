'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PasswordInfo } from '@/components/ui/password-info';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';
import { useChangePasswordForm } from '@/features/profile/hooks/use-change-password-form';

export default function SecurityPage() {
  const t = useTranslations('profile');
  const passwordForm = useChangePasswordForm();
  const [showPasswords, setShowPasswords] = useState(false);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <ProfileBackButton label="Profile" />
      <form
        action={passwordForm.action}
        className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8"
      >
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
          {t('security.title')}
        </h2>
        <div className="space-y-8 max-w-2xl">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
            >
              {t('security.currentPassword')}
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                name="current"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  passwordForm.setCurrentPassword(e.target.value)
                }
                placeholder={t('security.currentPasswordPlaceholder')}
                required
                className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-primary focus:bg-primary focus:text-primary-foreground transition-colors py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={
                  showPasswords
                    ? t('security.hidePasswords')
                    : t('security.showPasswords')
                }
                tabIndex={-1}
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <label
                htmlFor="new-password"
                className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
              >
                {t('security.newPassword')}
              </label>
              <PasswordInfo className="text-muted-foreground" />
            </div>
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              name="new"
              value={passwordForm.newPassword}
              onChange={(e) => passwordForm.setNewPassword(e.target.value)}
              placeholder={t('security.newPasswordPlaceholder')}
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-destructive focus:bg-destructive/10 focus:text-destructive transition-colors py-2"
            />
          </div>
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="confirm-password"
              className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
            >
              {t('security.confirmPassword')}
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              name="confirm"
              value={passwordForm.confirmPassword}
              onChange={(e) => passwordForm.setConfirmPassword(e.target.value)}
              placeholder={t('security.confirmPasswordPlaceholder')}
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-destructive focus:bg-destructive/10 focus:text-destructive transition-colors py-2"
            />
          </div>
          {passwordForm.newPassword && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="submit"
                disabled={passwordForm.isPending}
                className="w-full py-3 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 text-base sm:text-lg"
              >
                {passwordForm.isPending ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  t('security.submit')
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
