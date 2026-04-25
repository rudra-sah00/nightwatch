'use client';

import { Check, Loader2, Pencil, Play, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Clip } from '../types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ClipCardProps {
  clip: Clip;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ClipCard({ clip, onDelete, onRename }: ClipCardProps) {
  const isReady = clip.status === 'ready';
  const isProcessing = clip.status === 'processing';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(clip.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setEditValue(clip.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [clip.title]);

  const saveEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== clip.title) {
      onRename(clip.id, trimmed);
    }
    setEditing(false);
  }, [editValue, clip.id, clip.title, onRename]);

  const cancelEdit = useCallback(() => {
    setEditValue(clip.title);
    setEditing(false);
  }, [clip.title]);

  return (
    <Card className="p-2">
      {/* Thumbnail */}
      <div className="group aspect-video border-[3px] border-border overflow-hidden relative mb-4 flex-shrink-0 bg-background">
        {clip.thumbnailUrl ? (
          <Image
            src={clip.thumbnailUrl}
            alt={clip.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-[filter] duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-foreground/20 animate-spin" />
            ) : (
              <Play className="w-10 h-10 text-foreground/20 stroke-[3px]" />
            )}
          </div>
        )}

        {/* Duration badge — top left */}
        {clip.duration > 0 && (
          <div className="absolute top-3 left-3 bg-black/80 border-[2px] border-border px-2 py-0.5 font-headline font-black text-xs text-white tracking-wider">
            {formatDuration(clip.duration)}
          </div>
        )}

        {/* Date badge — top right */}
        <div className="absolute top-3 right-3 bg-neo-yellow border-[2px] border-border px-2 py-0.5 font-headline font-black uppercase text-xs text-foreground">
          {formatDate(clip.createdAt)}
        </div>

        {/* Status badge — bottom left */}
        {isProcessing && (
          <div className="absolute bottom-3 left-3 bg-neo-orange border-[2px] border-border px-2 py-0.5 font-headline font-black uppercase text-[10px] text-foreground tracking-widest flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </div>
        )}
        {clip.status === 'failed' && (
          <div className="absolute bottom-3 left-3 bg-neo-red border-[2px] border-border px-2 py-0.5 font-headline font-black uppercase text-[10px] text-white tracking-widest">
            Failed
          </div>
        )}

        {/* Play overlay */}
        {isReady && clip.videoUrl && (
          <a
            href={clip.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
          >
            <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg stroke-[3px]" />
          </a>
        )}
      </div>

      <CardContent className="px-2 pb-2">
        {/* Editable title */}
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              className="flex-1 min-w-0 font-headline text-lg font-black uppercase tracking-tighter bg-muted px-2 py-1 border-[2px] border-border outline-none focus:border-neo-blue"
              maxLength={100}
            />
            <button
              type="button"
              onClick={saveEdit}
              className="p-1 text-neo-green hover:bg-neo-green/10 rounded"
              aria-label="Save"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="p-1 text-foreground/40 hover:bg-muted rounded"
              aria-label="Cancel"
            >
              <X className="w-4 h-4 stroke-[3px]" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-headline text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight line-clamp-2 flex-1 min-w-0"
              title={clip.title}
            >
              {clip.title}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0 mt-1">
              <button
                type="button"
                onClick={startEdit}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground/30 hover:text-foreground transition-colors"
                aria-label="Rename clip"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(clip.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-foreground/30 hover:text-destructive transition-colors"
                aria-label="Delete clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
