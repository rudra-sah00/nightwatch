'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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

  const close = () => {
    setName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className="bg-background border-[3px] border-border p-6 w-80"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <h3 className="font-headline font-black uppercase tracking-tighter text-lg mb-4">
          {t('createPlaylist')}
        </h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('playlistName')}
          className="w-full bg-transparent border-none outline-none text-xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 border-border focus:border-neo-yellow py-2"
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && name.trim()) {
              await createUserPlaylist(name.trim());
              setName('');
              onClose();
              toast.success(t('createPlaylist'));
              onCreated();
            }
            if (e.key === 'Escape') close();
          }}
        />
      </div>
    </div>
  );
}
