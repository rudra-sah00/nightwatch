'use client';

import { X } from 'lucide-react';

interface MobileSidebarShellProps {
  visible: boolean;
  closing: boolean;
  direction: 'left' | 'right';
  onClose: () => void;
  children: React.ReactNode;
}

/** Shared full-width overlay wrapper for mobile sidebars. */
export function MobileSidebarShell({
  visible,
  closing,
  direction,
  onClose,
  children,
}: MobileSidebarShellProps) {
  if (!visible) return null;

  const animClass = closing
    ? `animate-out ${direction === 'left' ? 'slide-out-to-left' : 'slide-out-to-right'}`
    : `animate-in ${direction === 'left' ? 'slide-in-from-left' : 'slide-in-from-right'}`;

  return (
    <aside
      className={`absolute inset-0 z-40 bg-card flex flex-col overflow-hidden duration-200 fill-mode-both ${animClass}`}
    >
      <div className="flex items-center justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </aside>
  );
}
