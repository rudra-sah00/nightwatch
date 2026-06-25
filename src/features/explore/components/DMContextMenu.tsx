'use client';

import {
  Archive,
  ArchiveRestore,
  BellOff,
  BellRing,
  Lock,
  Mail,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hapticMedium } from '@/lib/haptics';

interface DMContextMenuProps {
  peerId: string;
  isArchived: boolean;
  isLocked: boolean;
  isMuted: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onClear: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onMarkUnread: () => void;
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

export function DMContextMenu({
  isArchived,
  isLocked,
  isMuted,
  onArchive,
  onUnarchive,
  onClear,
  onLock,
  onUnlock,
  onMute,
  onUnmute,
  onMarkUnread,
  children,
}: DMContextMenuProps) {
  const t = useTranslations('common.dm');
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    timerRef.current = setTimeout(() => {
      hapticMedium();
      setPosition({ x: touch.clientX, y: touch.clientY - 50 });
      setOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAction = (action: () => void) => {
    action();
    close();
  };

  return (
    <div
      role="none"
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {children}

      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] py-1.5 bg-card border border-border rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-150"
          style={{ left: position.x, top: position.y }}
        >
          <button
            type="button"
            onClick={() => handleAction(isArchived ? onUnarchive : onArchive)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            {isArchived ? (
              <ArchiveRestore className="w-4 h-4 text-foreground/60" />
            ) : (
              <Archive className="w-4 h-4 text-foreground/60" />
            )}
            {isArchived ? t('unarchive') : t('archive')}
          </button>
          <button
            type="button"
            onClick={() => handleAction(isMuted ? onUnmute : onMute)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            {isMuted ? (
              <BellRing className="w-4 h-4 text-foreground/60" />
            ) : (
              <BellOff className="w-4 h-4 text-foreground/60" />
            )}
            {isMuted ? t('unmute') : t('mute')}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onMarkUnread)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <Mail className="w-4 h-4 text-foreground/60" />
            {t('markUnread')}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onClear)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left text-red-500"
          >
            <Trash2 className="w-4 h-4" />
            {t('clearChat')}
          </button>
          <button
            type="button"
            onClick={() => handleAction(isLocked ? onUnlock : onLock)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            {isLocked ? (
              <Unlock className="w-4 h-4 text-foreground/60" />
            ) : (
              <Lock className="w-4 h-4 text-foreground/60" />
            )}
            {isLocked ? t('unlock') : t('lock')}
          </button>
        </div>
      )}
    </div>
  );
}
