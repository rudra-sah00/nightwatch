'use client';

import { Phone } from 'lucide-react';
import type { Message } from './DMView';
import { FilePreview } from './FilePreview';
import { LinkPreviewCard } from './LinkPreviewCard';

export function formatCallDuration(content: string): string {
  const match = content.match(/duration:(\d+)/);
  if (!match) return 'Ended';
  const secs = Number(match[1]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface DMMessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  msgs: Message[];
  onImageClick: (url: string) => void;
}

export function DMMessageBubble({
  msg,
  isOwn,
  msgs,
  onImageClick,
}: DMMessageBubbleProps) {
  return (
    <div className={`max-w-[75%] ${isOwn ? 'text-right' : 'text-left'}`}>
      {msg.forwardedFromId && (
        <p className="text-[9px] text-foreground/40 italic mb-0.5 px-1">
          Forwarded
        </p>
      )}
      {msg.replyToId && (
        <div className="text-[10px] text-foreground/50 bg-muted/50 border-l-2 border-primary/50 rounded px-2 py-1 mb-1 max-w-[200px] truncate">
          {msgs.find((m) => m.id === msg.replyToId)?.content?.slice(0, 60) ||
            'Original message'}
        </div>
      )}
      {msg.deletedForAll ? (
        <div className="inline-block px-3.5 py-2 rounded-2xl text-sm bg-muted/30 text-foreground/40 italic border border-border/50">
          Message deleted
        </div>
      ) : msg.content.startsWith('[call] ') ? (
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm bg-muted/20 border border-border/50 text-foreground/60">
          <Phone className="w-3.5 h-3.5" />
          <span>
            {msg.content.includes('missed')
              ? 'Missed call'
              : msg.content.includes('declined')
                ? 'Call declined'
                : `Call \u00B7 ${formatCallDuration(msg.content)}`}
          </span>
        </div>
      ) : msg.content.startsWith('[document] ') ? (
        <FilePreview url={msg.content.slice(11)} className="max-w-[280px]" />
      ) : msg.content.startsWith('[image] ') ? (
        <button
          type="button"
          onClick={() => onImageClick(msg.content.slice(8))}
          className="block"
        >
          <img
            src={msg.content.slice(8)}
            alt=""
            loading="lazy"
            className="max-w-[220px] rounded-xl border border-border hover:opacity-90 transition-opacity"
          />
        </button>
      ) : msg.content.startsWith('[video] ') ? (
        <video
          src={msg.content.slice(8)}
          controls
          playsInline
          preload="metadata"
          className="max-w-[220px] rounded-xl border border-border"
        >
          <track kind="captions" />
        </video>
      ) : msg.content.startsWith('[audio] ') ? (
        <audio
          src={msg.content.slice(8)}
          controls
          preload="metadata"
          className="max-w-[220px]"
        >
          <track kind="captions" />
        </audio>
      ) : (
        <div
          className={`inline-block px-3.5 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}
        >
          {msg.content}
        </div>
      )}
      {!msg.deletedForAll &&
        !msg.content.startsWith('[') &&
        msg.content.match(/https?:\/\/\S+/) && (
          <div className="mt-1 max-w-[250px]">
            <LinkPreviewCard content={msg.content} />
          </div>
        )}
      <div className="flex items-center gap-1 mt-0.5 px-1 justify-end">
        <p className="text-[9px] text-foreground/30">
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {isOwn && !msg.deletedForAll && (
          <span className="text-[9px]">
            {msg.readAt ? (
              <span className="text-primary">{'\u2713\u2713'}</span>
            ) : msg.deliveredAt ? (
              <span className="text-foreground/40">{'\u2713\u2713'}</span>
            ) : (
              <span className="text-foreground/30">{'\u2713'}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
