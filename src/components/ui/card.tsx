'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col rounded-none border-[4px] border-border group transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200',
        className,
      )}
      {...props}
    />
  );
}

function _CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-col space-y-1.5 p-6 border-b-[4px] border-border bg-background',
        className,
      )}
      {...props}
    />
  );
}

function _CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-2xl font-black font-headline uppercase leading-none tracking-tighter text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function _CardDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-xs font-headline font-bold uppercase tracking-widest text-[#4a4a4a]',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('p-6 flex-1', className)}
      {...props}
    />
  );
}

function _CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-6 mt-auto', className)}
      {...props}
    />
  );
}

export { Card, CardContent };
