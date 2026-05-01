import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/**
 * CVA variant definitions for the {@link Button} component.
 *
 * Variants:
 * - `variant` — visual style (`default`, `neo`, `neo-yellow`, `neo-red`,
 *   `neo-outline`, `neo-ghost`, `neo-base`, `none`).
 * - `size` — dimensions (`default`, `sm`, `lg`, `xl`, `2xl`, `icon`, `neo`,
 *   `neo-lg`, `none`).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md ring-offset-background transition-[background-color,color,border-color,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-headline font-medium tracking-normal',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-primary text-primary-foreground hover:bg-gray-800 hover:text-primary-foreground rounded-md',
        neo: 'border border-transparent bg-primary text-primary-foreground hover:bg-gray-800 hover:text-primary-foreground rounded-md',
        'neo-yellow':
          'border border-transparent bg-neo-yellow text-foreground hover:bg-neo-yellow/80 hover:text-foreground rounded-md',
        'neo-red':
          'border border-transparent bg-neo-red text-primary-foreground hover:bg-neo-red/80 hover:text-primary-foreground rounded-md',
        'neo-outline':
          'bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md',
        'neo-ghost':
          'border border-transparent bg-transparent text-foreground hover:bg-black/5 hover:text-foreground rounded-md',
        'neo-base':
          'transition-[background-color,color,border-color,opacity,transform]',
        none: '',
      },
      size: {
        none: '',
        default: 'h-auto py-3 px-6 text-sm',
        sm: 'h-auto py-2 px-4 text-xs',
        lg: 'h-12 px-8 text-xl',
        xl: 'h-14 px-10 text-2xl',
        '2xl': 'h-16 px-12 text-2xl',
        icon: 'h-10 w-10',
        neo: 'h-auto py-3 px-6',
        'neo-lg': 'h-auto py-4 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Props for the {@link Button} component. */
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element via Radix `Slot` (composition pattern). */
  asChild?: boolean;
  /** Show a spinner and disable the button while an async action is in flight. */
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Neo-brutalist button primitive with CVA variants.
 *
 * Triggers a light haptic on every click (native only). When `isLoading` is
 * `true` the button is disabled and an animated spinner is prepended.
 *
 * Supports the Radix `asChild` composition pattern via `@radix-ui/react-slot`.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading,
  children,
  ref,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    hapticLight();
    onClick?.(e);
  };

  // When using asChild, don't render loading state to avoid multiple children
  // The Slot component expects exactly one child
  if (asChild) {
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      aria-live={isLoading ? 'polite' : 'off'}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </Comp>
  );
}

export { Button };
