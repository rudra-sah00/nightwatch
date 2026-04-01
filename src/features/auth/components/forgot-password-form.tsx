'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useLoginForm } from '../hooks/use-login-form';
import { AuthCard } from './auth-card';

export function ForgotPasswordForm(props: ReturnType<typeof useLoginForm>) {
  const {
    step,
    setStep,
    isPending,
    formData,
    handleChange,
    action,
    captchaToken,
    setCaptchaToken,
  } = props;

  const isSuccess = step === 'forgot_success';

  return (
    <AuthCard title={isSuccess ? 'SUCCESS' : 'RECOVERY'} className="h-[440px]">
      {!isSuccess && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* TOP */}
          <div className="w-full shrink-0">
            <div className="flex items-center justify-between h-4 mb-1">
              <Label
                htmlFor="identifier"
                className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
              >
                EMAIL OR USERNAME
              </Label>
            </div>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="ALIAS OR COMMUNICATION LINE"
              value={formData.identifier}
              onChange={handleChange}
              disabled={isPending}
              className="h-[46px] text-xs font-black uppercase transition-all relative"
            />
          </div>

          {/* MIDDLE */}
          <div className="flex justify-center items-center mt-6 mb-6 min-h-[68px]">
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
          <div className="flex flex-col gap-2 pb-0.5">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isPending}
              disabled={
                !captchaToken || isPending || !formData.identifier?.trim()
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isPending ? 'DISPATCHING...' : 'DISPATCH RESET LINK'}
            </Button>
            <Button
              type="button"
              onClick={() => setStep('initial')}
              variant="neo-outline"
              size="xl"
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline transition-all hover:bg-[#ffcc00]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              BACK TO LOGIN
            </Button>
          </div>
        </form>
      )}

      {isSuccess && (
        <div className="h-full flex flex-col justify-between pt-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="shrink-0 flex flex-col justify-center items-center text-center gap-3 mt-4">
            <div className="h-10 w-10 border-[3px] border-border bg-[#ffcc00] flex items-center justify-center  shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-[13px] font-body font-black text-foreground leading-tight uppercase tracking-[0.05em]">
              SECURITY LINK DISPATCHED TO:
            </p>
            <span className="font-black underline decoration-[#e63b2e] decoration-2 tracking-tighter text-xl italic block leading-tight">
              {formData.identifier}
            </span>
          </div>

          <div className="flex flex-col gap-2 pb-0.5 mb-1 mt-auto">
            <Button
              onClick={() => setStep('initial')}
              variant="default"
              size="xl"
              className="w-full h-[52px] font-headline uppercase italic tracking-tighter text-sm font-black shrink-0"
            >
              RETURN TO ENTRANCE
            </Button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
