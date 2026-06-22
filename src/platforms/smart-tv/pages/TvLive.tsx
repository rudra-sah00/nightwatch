'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { IptvChannel } from '@/features/livestream/api';
import { useIptvChannels } from '@/features/livestream/hooks/use-iptv';
import { TvActionButton } from '../components/TvActionButton';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function ChannelCard({
  channel,
  onPress,
}: {
  channel: IptvChannel;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });
  return (
    <div
      ref={ref}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-[3px] transition-all ${
        focused ? 'border-indigo-500 scale-105 z-10 bg-card' : 'border-border'
      }`}
    >
      {channel.icon ? (
        <img
          src={channel.icon}
          alt={channel.name}
          className="w-16 h-16 object-contain rounded-lg"
        />
      ) : (
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl text-muted-foreground">
            live_tv
          </span>
        </div>
      )}
      <p className="text-xs font-headline font-bold uppercase tracking-tight text-center truncate w-full">
        {channel.name}
      </p>
    </div>
  );
}

function ChannelDetail({
  channel,
  onClose,
}: {
  channel: IptvChannel;
  onClose: () => void;
}) {
  const t = useTranslations('common.tv.live');
  const router = useRouter();
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'LIVE_CHANNEL_DETAIL',
    isFocusBoundary: true,
  });

  // Focus self on mount and handle escape
  useEffect(() => {
    const t = setTimeout(() => focusSelf(), 50);
    return () => clearTimeout(t);
  }, [focusSelf]);

  // Handle escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Hero */}
        <div className="w-full h-[40vh] bg-muted border-b-[4px] border-border relative flex items-center justify-center">
          {channel.icon ? (
            <img
              src={channel.icon}
              alt={channel.name}
              className="max-w-[200px] max-h-[200px] object-contain"
            />
          ) : (
            <span className="material-symbols-outlined text-[80px] text-muted-foreground">
              live_tv
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-8 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-card border-2 border-border text-xs font-black font-headline uppercase tracking-widest">
              Live TV
            </span>
          </div>
          <h1 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2">
            {channel.name}
          </h1>
          {channel.category && (
            <p className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">
              {channel.category}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 px-8 pb-8">
          <TvActionButton
            label={t('watchSolo')}
            icon="play_arrow"
            color="blue"
            onPress={() =>
              router.push(
                `/live/${channel.id}?type=iptv&title=${encodeURIComponent(channel.name)}`,
              )
            }
          />
          <TvActionButton
            label={t('watchTogether')}
            icon="group"
            color="yellow"
            onPress={() => {
              const roomId = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
              router.push(
                `/watch-party/${roomId}?new=true&contentId=${channel.id}&type=livestream`,
              );
            }}
          />
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function EmptyState() {
  const { ref, focused } = useFocusable();
  return (
    <div
      ref={ref}
      className={`py-32 border-[4px] border-dashed text-center flex flex-col items-center justify-center bg-card rounded-xl transition-colors ${
        focused ? 'border-indigo-500' : 'border-border'
      }`}
    >
      <span className="material-symbols-outlined text-6xl text-foreground/20 mb-6">
        live_tv
      </span>
      <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
        No Channels
      </p>
      <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
        Live TV channels will appear here
      </p>
    </div>
  );
}

export function TvLive() {
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_LIVE_PAGE' });
  const { channels, isLoading } = useIptvChannels();
  const [selectedChannel, setSelectedChannel] = useState<IptvChannel | null>(
    null,
  );
  const [numBuffer, setNumBuffer] = useState('');
  const numTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useTvFocus('tv-live', FOCUS_KEYS.CONTENT);

  // Number key channel switching: type digits, after 1.5s of no input, select that channel index
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9' && !selectedChannel) {
        setNumBuffer((b) => b + e.key);
        clearTimeout(numTimerRef.current);
        numTimerRef.current = setTimeout(() => {
          setNumBuffer((buf) => {
            const idx = parseInt(buf, 10) - 1;
            if (idx >= 0 && idx < channels.length) {
              setSelectedChannel(channels[idx]);
            }
            return '';
          });
        }, 1500);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(numTimerRef.current);
    };
  }, [channels, selectedChannel]);

  if (selectedChannel) {
    return (
      <ChannelDetail
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
      />
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto">
        {/* Number key input overlay */}
        {numBuffer && (
          <div className="fixed top-8 right-8 z-50 bg-black/80 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20">
            <span className="text-3xl font-mono font-bold text-white">
              {numBuffer}
            </span>
          </div>
        )}
        {/* Hero — same as web */}
        <div className="mb-8 bg-neo-yellow relative overflow-hidden rounded-2xl mx-8 mt-8">
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-20 rotate-12" />
          <div className="relative z-10 px-10 py-12">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
              LIVE
              <br />
              <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                STREAM
              </span>
            </h1>
            <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
              Watch live TV channels
            </p>
          </div>
        </div>

        {/* Channel Grid */}
        <div className="px-8 pb-8">
          {isLoading && (
            <p className="text-muted-foreground font-headline font-bold uppercase tracking-widest text-sm">
              Loading channels...
            </p>
          )}

          {!isLoading && channels.length === 0 && <EmptyState />}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onPress={() => setSelectedChannel(ch)}
              />
            ))}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
