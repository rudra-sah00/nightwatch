'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createUserPlaylist } from '@/features/music/api';

interface CreatePlaylistDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePlaylistDialog({
  onClose,
  onCreated,
}: CreatePlaylistDialogProps) {
  const t = useTranslations('music');
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    inputRef.current?.focus();
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => {
      setName('');
      onClose();
    }, 200);
  };

  const submit = async () => {
    if (!name.trim()) return;
    await createUserPlaylist(name.trim());
    setName('');
    onClose();
    toast.success(t('createPlaylist'));
    onCreated();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex flex-col items-center transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('playlistName')}
          className="w-80 bg-transparent border-b border-white/20 outline-none text-2xl font-black font-headline uppercase text-white placeholder:text-white/40 text-center py-3"
          onKeyDown={async (e) => {
            if (e.key === 'Enter') await submit();
            if (e.key === 'Escape') close();
          }}
        />
        <div className="flex gap-6 mt-4">
          <button
            type="button"
            className="text-white/60 text-xs font-headline uppercase tracking-wider cursor-pointer hover:text-white"
            onClick={submit}
          >
            enter ↵
          </button>
          <button
            type="button"
            className="text-white/60 text-xs font-headline uppercase tracking-wider cursor-pointer hover:text-white"
            onClick={close}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
