'use client';

import { Volume2 } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { emitPartyInteraction, onPartyInteraction } from '../../api';

const SOUNDS = [
  { id: 'airhorn', name: 'Airhorn', icon: '📢', src: '/sounds/Airhorn.mp3' },
  { id: 'applause', name: 'Applause', icon: '👏', src: '/sounds/Applause.mp3' },
  { id: 'laugh', name: 'Laugh', icon: '😂', src: '/sounds/Laugh.mp3' },
  { id: 'wow', name: 'Wow', icon: '😮', src: '/sounds/Wow.mp3' },
];

export function Soundboard() {
  const playSound = useCallback((soundId: string) => {
    const sound = SOUNDS.find((s) => s.id === soundId);
    if (sound) {
      const audio = new Audio(sound.src);
      audio.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const cleanup = onPartyInteraction((data) => {
      if (data.type === 'sound') {
        playSound(data.value);
      }
    });

    return cleanup;
  }, [playSound]);

  const handleTriggerSound = (id: string, name: string) => {
    playSound(id);
    emitPartyInteraction({ type: 'sound', value: id });
    toast.success(`Played ${name}`, { duration: 1000 });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4" /> Soundboard
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {SOUNDS.map((sound) => (
            <Button
              key={sound.id}
              variant="outline"
              size="sm"
              onClick={() => handleTriggerSound(sound.id, sound.name)}
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
            >
              <span className="text-xl">{sound.icon}</span>
              <span className="font-medium text-sm">{sound.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
