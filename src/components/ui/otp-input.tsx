import type React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface OtpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

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
          'text-center text-2xl tracking-[0.5em] font-mono h-14',
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
