'use client';

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
    <div className="absolute inset-0 z-[200]">
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm duration-200 ${closing ? 'animate-out fade-out' : 'animate-in fade-in'}`}
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />
      <aside
        className={`absolute top-0 bottom-0 ${direction === 'left' ? 'left-0' : 'right-0'} w-[75%] bg-card flex flex-col overflow-hidden duration-200 fill-mode-both shadow-2xl ${animClass}`}
      >
        {children}
      </aside>
    </div>
  );
}
