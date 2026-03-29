import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors',
  {
    variants: {
      variant: {
        default:
          'font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#1a1a1a]',
        neo: 'font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#1a1a1a]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Label = ({
  className,
  variant,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & {
    ref?: React.Ref<React.ComponentRef<typeof LabelPrimitive.Root>>;
  }) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
);

export { Label };
