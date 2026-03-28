'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPasswordForm } from '@/features/auth/hooks/use-forgot-password-form';

export function ForgotPasswordForm() {
  const {
    isLoading,
    error,
    success,
    formData,
    fieldErrors,
    handleChange,
    handleSubmit,
  } = useForgotPasswordForm();

  return (
    <div className="w-full h-full flex flex-col justify-start">
      <div className="mb-1 shrink-0 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-[#1a1a1a] mb-0 font-headline">
          Watch Rudra
        </h1>
        <p className="font-headline font-bold text-[10px] uppercase tracking-[0.2em] text-[#e63b2e]">
          Form Follows Function
        </p>
      </div>

      <div className="border-b-4 border-[#1a1a1a] pb-0.5 mb-2 shrink-0">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter font-headline text-[#1a1a1a]">
          {success ? 'Success' : 'Reset'}
        </h2>
        <p className="font-body font-semibold text-[8px] md:text-[9px] text-[#1a1a1a] opacity-60 uppercase tracking-widest">
          {success ? 'ACCOUNT SECURED' : 'RECOVER YOUR ACCESS'}
        </p>
      </div>

      <div className="flex-grow flex flex-col justify-start">
        {success ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 py-4 text-center md:text-left">
            <div className="space-y-2">
              <div className="h-12 w-12 border-[4px] border-[#1a1a1a] bg-[#ffcc00] flex items-center justify-center mx-auto md:mx-0 text-[#1a1a1a] neo-shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-body font-medium text-[#1a1a1a]">
                A reset link has been dispatched to{' '}
                <span className="font-bold underline decoration-[#e63b2e] decoration-2">
                  {formData.email}
                </span>
                . Please review your archive (including spam) to finalize the
                recovery.
              </p>
            </div>

            <Button
              asChild
              className="w-full bg-[#1a1a1a] hover:bg-[#333333] text-white border-4 border-[#1a1a1a] py-3 text-base font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover transition-all rounded-none h-auto"
            >
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="h-full flex flex-col space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 w-full px-1"
          >
            {error ? (
              <div className="flex items-center gap-3 border-4 border-[#1a1a1a] bg-[#e63b2e] p-3 text-white neo-shadow-sm mb-2 shrink-0">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-headline font-bold uppercase text-[10px] tracking-widest">
                  {error}
                </p>
              </div>
            ) : null}

            <div className="space-y-1 shrink-0">
              <Label
                htmlFor="email"
                className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-0.5 text-[#1a1a1a]"
              >
                Identification Email
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="mies@bauhaus.de"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                autoComplete="email"
                disabled={isLoading}
                className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
              />
            </div>

            {/* Spacer pushes buttons to the bottom */}
            <div className="flex-grow" />

            <div className="flex flex-col gap-2 shrink-0 pt-2 border-t-4 border-[#1a1a1a] mt-auto">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full bg-[#ffcc00] hover:bg-[#ffe066] text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 md:py-3.5 text-lg md:text-xl font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto"
              >
                {isLoading ? 'Dispatching...' : 'Dispatch Reset Link'}
              </Button>

              <Button
                asChild
                type="button"
                className="w-full bg-transparent hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-[10px] md:text-xs font-bold uppercase tracking-tight transition-all rounded-none h-auto flex items-center justify-center gap-2"
              >
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
