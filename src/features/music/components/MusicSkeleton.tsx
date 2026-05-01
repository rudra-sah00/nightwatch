'use client';

import ReactSkeleton from 'react-loading-skeleton';
import { AppSkeletonTheme } from '@/components/ui/skeleton-theme';

export function MusicSkeleton() {
  return (
    <AppSkeletonTheme>
      <div className="space-y-6 py-4">
        {[1, 2, 3, 4, 5, 6].map((section) => (
          <div key={section} className="px-6">
            <ReactSkeleton
              width={90}
              height={10}
              style={{ marginBottom: 12 }}
            />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((card) => (
                <div key={card} className="flex-shrink-0 w-36 md:w-40">
                  <ReactSkeleton className="w-36 md:w-40 aspect-square" />
                  <ReactSkeleton
                    width="70%"
                    height={10}
                    style={{ marginTop: 8 }}
                  />
                  <ReactSkeleton
                    width="45%"
                    height={8}
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppSkeletonTheme>
  );
}
