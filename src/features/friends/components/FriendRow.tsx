'use client';

import { Phone, ShieldBan, UserMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { formatActivity } from '@/features/friends/format-activity';
import { useCall } from '@/features/friends/hooks/use-call';
import type { FriendActivity } from '@/features/friends/types';
import { hapticMedium } from '@/lib/haptics';
import { Avatar } from './Avatar';

interface FriendRowProps {
  id: string;
  name: string;
  photo: string | null;
  isOnline: boolean;
  activity: FriendActivity | null;
  onBlock?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const FriendRow = memo(function FriendRow({
  id,
  name,
  photo,
  isOnline,
  activity,
  onBlock,
  onRemove,
}: FriendRowProps) {
  const { initiateCall, callState } = useCall();
  const t = useTranslations('common.friends');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen, closeMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    timerRef.current = setTimeout(() => {
      hapticMedium();
      setMenuPos({ x: touch.clientX, y: touch.clientY - 50 });
      setMenuOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      role="none"
      className="relative flex items-center gap-3 py-2"
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <div className="relative shrink-0">
        <Avatar name={name} photo={photo} size={32} />
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-headline font-bold truncate block ${isOnline ? '' : 'text-foreground/40'}`}
        >
          {name}
        </span>
        {activity && (
          <span
            className={`text-[10px] truncate block leading-tight ${activity.type === 'music' ? 'text-neo-blue/70' : activity.type === 'game' ? 'text-neo-green/70' : 'text-neo-yellow/70'}`}
          >
            {formatActivity(activity)}
          </span>
        )}
      </div>
      {isOnline && (
        <button
          type="button"
          onClick={() => initiateCall({ id, name, photo })}
          disabled={callState !== 'idle'}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          aria-label={`Call ${name}`}
        >
          <Phone className="w-4 h-4 text-foreground/40" />
        </button>
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] py-1.5 bg-card border border-border rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-150"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {onRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove(id);
                closeMenu();
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <UserMinus className="w-4 h-4 text-foreground/60" />
              {t('removeFriend')}
            </button>
          )}
          {onBlock && (
            <button
              type="button"
              onClick={() => {
                onBlock(id);
                closeMenu();
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left text-red-500"
            >
              <ShieldBan className="w-4 h-4" />
              {t('blockUser')}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
