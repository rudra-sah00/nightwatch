import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * CVA variant definitions for the {@link Badge} component.
 *
 * Variants:
 * - `variant` — color scheme (`default`, `blue`, `yellow`, `red`).
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center border-2 border-border px-2 py-0.5 text-[10px] font-black font-headline uppercase tracking-widest w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        blue: 'bg-neo-blue text-primary-foreground',
        yellow: 'bg-neo-yellow text-foreground',
        red: 'bg-neo-red text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Small status label rendered as a `<span>` with neo-brutalist 2px borders.
 *
 * Supports the Radix `asChild` composition pattern to render as a different element.
 */
function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
