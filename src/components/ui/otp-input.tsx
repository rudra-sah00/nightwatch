import type React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

/** Props for the {@link OtpInput} component. */
interface OtpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Current OTP value (digits only, max 6 characters). */
  value: string;
  /** Change handler — receives a sanitized (digits-only) value. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Six-digit one-time-password input field.
 *
 * Renders a single wide {@link Input} with `inputMode="numeric"`, large
 * letter-spaced characters, and automatic non-digit stripping. Supports
 * browser autofill via `autoComplete="one-time-code"`.
 */
export function OtpInput({
  className,
  value,
  onChange,
  ...props
}: OtpInputProps) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="123456"
        className={cn(
          'text-center text-3xl tracking-[0.6em] font-headline font-black h-16 transition-[background-color,color,border-color,box-shadow,opacity,transform]',
          className,
        )}
        value={value}
        onChange={(e) => {
          // Only allow numbers
          const val = e.target.value.replace(/\D/g, '');
          if (val.length <= 6) {
            onChange({ ...e, target: { ...e.target, value: val } });
          }
        }}
        {...props}
      />
    </div>
  );
}
