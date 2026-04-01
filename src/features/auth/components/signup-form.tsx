'use client';

import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInfo } from '@/components/ui/password-info';
import type { useSignupForm } from '../hooks/use-signup-form';
import { AuthCard } from './auth-card';

export function SignupForm(props: ReturnType<typeof useSignupForm>) {
  const {
    step,
    setStep,
    isPending,
    formData,
    handleChange,
    action,
    captchaToken,
    setCaptchaToken,
    otp,
    setOtp,
    handleOtpSubmit,
    handleResend,
    countdown,
    isLoading,
    usernameStatus,
    confirmPassword,
    setConfirmPassword,
  } = props;

  const getHeader = () => {
    switch (step) {
      case 'otp':
        return 'VERIFY';
      case 'name':
        return 'DISCOVERY';
      case 'details':
        return 'SECURITY';
      default:
        return 'DISCOVERY';
    }
  };

  return (
    <AuthCard title={getHeader()} className="h-[440px]">
      {step === 'otp' && (
        <div className="h-full flex flex-col pt-1 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col justify-start">
            <p className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.18em] opacity-80 text-center mb-2">
              CODE DISPATCHED TO
            </p>
            <p className="font-black border-b-2 border-border text-center py-1.5 tracking-tighter text-lg italic mb-5 leading-tight">
              {formData.email}
            </p>
            <div className="w-full shrink-0 mt-2">
              <div className="flex items-center justify-center h-4 mb-2">
                <Label
                  htmlFor="otp"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  SECURITY CODE
                </Label>
              </div>
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setOtp(val);
                }}
                disabled={isLoading}
                className="h-[46px] text-base font-black uppercase text-center tracking-[0.5em] transition-all relative"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pb-0.5 mt-8">
            <Button
              onClick={handleOtpSubmit}
              variant="neo-yellow"
              size="xl"
              isLoading={isLoading}
              disabled={isLoading || (otp?.length || 0) !== 6}
              className="w-full h-[52px] font-headline uppercase italic tracking-tighter text-sm font-black shrink-0"
            >
              VERIFY ACCESS
            </Button>
            <Button
              type="button"
              onClick={handleResend}
              variant="neo-outline"
              size="xl"
              disabled={isLoading || (countdown || 0) > 0}
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline transition-all hover:bg-[#ffcc00]/10"
            >
              {(countdown || 0) > 0 ? `RETRY IN ${countdown}S` : 'RESEND KEY'}
            </Button>
          </div>
        </div>
      )}

      {step === 'name' && (
        <form
          action={action}
          className="h-full flex flex-col justify-between pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* TOP */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="name"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  NAME
                </Label>
              </div>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="WALTER GROPIUS"
                value={formData.name}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative"
              />
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="username"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  USERNAME
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="WALTER_1919"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isPending}
                  className="h-[46px] text-xs font-black uppercase transition-all relative"
                />
                {usernameStatus && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-border/20 border-t-[#1a1a1a] animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-emerald-600 font-black text-xs">
                        ✓
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-[#e63b2e] font-black text-xs">
                        ✗
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="email"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  EMAIL ADDRESS
                </Label>
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="DIRECTOR@BAUHAUS.DE"
                value={formData.email}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative"
              />
            </div>
          </div>

          {/* BOTTOM */}
          <div className="flex flex-col gap-2 pb-0.5 mt-auto">
            <Button
              type="button"
              onClick={() => setStep('details')}
              variant="default"
              size="xl"
              disabled={
                !formData.name?.trim() ||
                !formData.email?.trim() ||
                !formData.username?.trim() ||
                usernameStatus !== 'available' ||
                isPending
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              CONFIRM IDENTITY
            </Button>
            <div className="h-[42px] w-full shrink-0" aria-hidden="true" />
          </div>
        </form>
      )}

      {step === 'details' && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Preserve state from previous step */}
          <input type="hidden" name="name" value={formData.name || ''} />
          <input
            type="hidden"
            name="username"
            value={formData.username || ''}
          />
          <input type="hidden" name="email" value={formData.email || ''} />
          <input
            type="hidden"
            name="inviteCode"
            value={formData.inviteCode || ''}
          />

          {/* TOP */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  PASSWORD
                </Label>
                <div className="flex items-center h-full">
                  <PasswordInfo />
                </div>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative tracking-[0.2em]"
              />
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="confirmPassword"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  CONFIRM PASSWORD
                </Label>
              </div>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword?.(e.target.value)
                }
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative tracking-[0.2em]"
              />
            </div>
          </div>

          {/* MIDDLE: Captcha centrally placed so its spacing is perfectly equal from top and bottom */}
          <div className="flex justify-center items-center my-auto min-h-[68px]">
            <input
              type="hidden"
              name="captchaToken"
              value={captchaToken || ''}
            />
            <Captcha
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              variant="bottom"
            />
          </div>

          {/* BOTTOM */}
          <div className="flex flex-col gap-2 pb-0.5 mt-auto mb-6">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isPending}
              disabled={
                !captchaToken ||
                !formData.password?.trim() ||
                !confirmPassword?.trim() ||
                isPending
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isPending ? 'INITIATING...' : 'BEGIN ARCHIVE'}
            </Button>
            <Button
              type="button"
              onClick={() => setStep('name')}
              variant="neo-outline"
              size="xl"
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline transition-all hover:bg-[#ffcc00]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              REVERT
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
