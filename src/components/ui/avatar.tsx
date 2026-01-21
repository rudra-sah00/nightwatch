'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
}

export function Avatar({
  className,
  src,
  alt,
  fallback,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary',
        className,
      )}
      {...props}
    >
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
          onError={() => setHasError(true)}
          fill
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground">
          {fallback || <User className="h-5 w-5" />}
        </div>
      )}
    </div>
  );
}
