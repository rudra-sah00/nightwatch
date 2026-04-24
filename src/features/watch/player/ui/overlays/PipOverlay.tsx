'use client';

import { Maximize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';

export function PipOverlay() {
  const [isPip, setIsPip] = useState(false);
  const [title, setTitle] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!checkIsDesktop() || !desktopBridge.onPipModeChanged) return;
    const unsub = desktopBridge.onPipModeChanged((pip) => setIsPip(pip));
    return () => unsub();
  }, []);

  // Get the current page title as the playing content
  useEffect(() => {
    if (!isPip) return;
    setTitle(
      document.title.replace(' — Nightwatch', '').replace(' | Nightwatch', ''),
    );
  }, [isPip]);

  // Show header on hover, hide after delay
  useEffect(() => {
    if (!isPip) return;
    let hideTimer: NodeJS.Timeout;
    const show = () => {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), 2500);
    };
    window.addEventListener('mousemove', show);
    return () => {
      window.removeEventListener('mousemove', show);
      clearTimeout(hideTimer);
    };
  }, [isPip]);

  if (!isPip) return null;

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    desktopBridge.setPictureInPicture(false);
  };

  return (
    <div
      className={`pip-header-overlay fixed top-0 left-0 right-0 z-[999999] flex items-center justify-between px-3 py-1.5 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-[11px] font-headline font-bold text-white/80 truncate mr-2">
        {title || 'Nightwatch'}
      </span>
      <button
        type="button"
        onClick={handleMaximize}
        className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        aria-label="Maximize"
      >
        <Maximize2 className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  );
}
