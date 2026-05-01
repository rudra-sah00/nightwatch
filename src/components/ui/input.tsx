import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * CVA variant definitions for the {@link Input} component.
 *
 * Variants:
 * - `variant` — visual style (`default`, `neo`). Both use a bottom-border
 *   underline aesthetic.
 */
const inputVariants = cva(
  'flex w-full ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-muted/30 border-x-0 border-t-0 border-b-4 border-border rounded-none p-2 px-3 focus:bg-background focus:ring-0 text-foreground text-sm h-[42px] font-body',
        neo: 'bg-muted/30 border-x-0 border-t-0 border-b-4 border-border rounded-none p-2 px-3 focus:bg-background focus:ring-0 text-foreground text-sm h-[42px] font-body',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Props for the {@link Input} component. */
interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Validation error message displayed below the input. */
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Neo-brutalist text input with CVA variants and inline error display.
 *
 * When an `error` string is provided the input border turns destructive-red
 * and an animated error message appears below. Automatically wires
 * `aria-invalid` and `aria-describedby` for accessibility.
 */
function Input({ className, variant, type, error, ref, ...props }: InputProps) {
  const errorId = error && props.id ? `${props.id}-error` : undefined;
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
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-neo-red motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-reduce:animate-none"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Input };
