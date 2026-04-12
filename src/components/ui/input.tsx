import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[#f2ede5] border-x-0 border-t-0 border-b-4 border-border rounded-none p-2 px-3 focus:bg-white focus:ring-0 text-foreground text-sm h-[42px] font-body',
        neo: 'bg-[#f2ede5] border-x-0 border-t-0 border-b-4 border-border rounded-none p-2 px-3 focus:bg-white focus:ring-0 text-foreground text-sm h-[42px] font-body',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ className, variant, type, error, ref, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        type={type}
        className={cn(
          inputVariants({ variant }),
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        ref={ref}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-[#e63b2e] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-reduce:animate-none">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Input };
