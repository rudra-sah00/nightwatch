'use client';

import { X } from 'lucide-react';

interface MobileSidebarShellProps {
  visible: boolean;
  closing: boolean;
  direction: 'left' | 'right';
  onClose: () => void;
  children: React.ReactNode;
}

/** Shared 75%-width overlay wrapper for mobile sidebars with backdrop blur. */
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
    <div className="absolute inset-0 z-40">
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm duration-200 ${closing ? 'animate-out fade-out' : 'animate-in fade-in'}`}
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />
      {/* Panel */}
      <aside
        className={`absolute top-0 bottom-0 ${direction === 'left' ? 'left-0' : 'right-0'} w-[75%] bg-card flex flex-col overflow-hidden duration-200 fill-mode-both shadow-2xl ${animClass}`}
      >
        <div
          className={`flex items-center ${direction === 'left' ? 'justify-end' : 'justify-end'} px-4 pt-3`}
        >
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
    </div>
  );
}
