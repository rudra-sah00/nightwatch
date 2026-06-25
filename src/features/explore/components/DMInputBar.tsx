'use client';

import {
  Camera,
  Image as ImageIcon,
  Keyboard,
  Mic,
  Play,
  Plus,
  Send,
  X,
} from 'lucide-react';
import type { PostTag } from '@/features/explore/types';
import { SLASH_COMMANDS } from '@/features/explore/types';
import type { Message } from './DMView';
import { Waveform } from './Waveform';

interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  duration?: number;
  thumbnailUrl?: string;
  filename?: string;
}

interface DMInputBarProps {
  input: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  attachPanel: boolean;
  onToggleAttachPanel: () => void;
  isRecording: boolean;
  recordingDuration: number;
  analyser: AnalyserNode | null;
  attachment: MediaAttachment | null;
  attachedTag: PostTag | null;
  onClearAttachment: () => void;
  onClearTag: () => void;
  isUploading: boolean;
  replyingTo: Message | null;
  onCancelReply: () => void;
  peerName: string;
  userId: string | undefined;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startRecording: () => void;
  stopRecording: () => void;
  onGifToggle: () => void;
  slashCommand: string | null;
  tagResults: PostTag[];
  onTagSelect: (tag: PostTag) => void;
  sendDisabled: boolean;
}

export function DMInputBar({
  input,
  onInputChange,
  onSend,
  attachPanel,
  onToggleAttachPanel,
  isRecording,
  recordingDuration,
  analyser,
  attachment,
  attachedTag,
  onClearAttachment,
  onClearTag,
  isUploading,
  replyingTo,
  onCancelReply,
  peerName,
  userId,
  imageInputRef,
  videoInputRef,
  onMediaSelect,
  startRecording,
  stopRecording,
  onGifToggle,
  slashCommand,
  tagResults,
  onTagSelect,
  sendDisabled,
}: DMInputBarProps) {
  return (
    <>
      {slashCommand && tagResults.length > 0 && (
        <div className="border-t border-border/50 max-h-40 overflow-y-auto px-3 py-2 space-y-1 bg-card">
          {tagResults.map((tag: PostTag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onTagSelect(tag)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-left text-sm transition-colors"
            >
              {tag.image && (
                <img
                  src={tag.image}
                  alt=""
                  className="w-8 h-8 rounded object-cover"
                />
              )}
              <span className="truncate">{tag.title}</span>
              <span className="text-[10px] text-foreground/40 ml-auto">
                {tag.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {input === '/' && (
        <div className="px-3 py-2 space-y-1 bg-card">
          {SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => onInputChange(`${cmd.command} `)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-muted/50 text-left text-sm"
            >
              <span className="font-mono text-primary">{cmd.command}</span>
              <span className="text-foreground/50 text-xs">{cmd.label}</span>
            </button>
          ))}
        </div>
      )}

      {attachedTag && (
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-foreground/50 text-xs">
              {attachedTag.type}
            </span>
            <span className="truncate max-w-[150px]">{attachedTag.title}</span>
            <button
              type="button"
              onClick={onClearTag}
              className="text-foreground/40 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {attachment && (
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
            {attachment.type === 'audio' && attachment.duration != null ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const a = new Audio(attachment.url);
                    a.play();
                  }}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <Play className="w-3 h-3 text-primary-foreground" />
                </button>
                <span className="text-xs text-foreground/70">
                  {Math.floor(attachment.duration / 60)}:
                  {String(attachment.duration % 60).padStart(2, '0')} voice note
                </span>
              </>
            ) : attachment.thumbnailUrl ? (
              <>
                <img
                  src={attachment.thumbnailUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover"
                />
                <span className="text-xs text-foreground/70">
                  {attachment.type}
                </span>
              </>
            ) : attachment.filename ? (
              <span className="truncate max-w-[180px] text-xs text-foreground/70">
                {attachment.filename}
              </span>
            ) : (
              <>
                <span className="text-foreground/50 text-xs">
                  {attachment.type}
                </span>
                <span className="truncate max-w-[150px] text-xs">Attached</span>
              </>
            )}
            <button
              type="button"
              onClick={onClearAttachment}
              className="text-foreground/40 hover:text-foreground ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="px-3 py-1">
          <span className="text-xs text-foreground/40">Uploading...</span>
        </div>
      )}

      {replyingTo && (
        <div className="px-3 py-1.5 flex items-center gap-2 border-t border-border/50 bg-muted/20">
          <div className="flex-1 border-l-2 border-primary pl-2">
            <p className="text-[10px] text-primary font-bold">
              Replying to{' '}
              {replyingTo.senderId === userId ? 'yourself' : peerName}
            </p>
            <p className="text-[11px] text-foreground/50 truncate">
              {replyingTo.content.slice(0, 80)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-foreground/40 hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="px-3 py-2 flex items-end gap-2">
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={onMediaSelect}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
          className="hidden"
          onChange={onMediaSelect}
        />
        <button
          type="button"
          onClick={onToggleAttachPanel}
          className={`p-2 rounded-full shrink-0 transition-colors active:scale-90 ${attachPanel ? 'bg-primary text-primary-foreground' : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50'}`}
        >
          {attachPanel ? (
            <Keyboard className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
        <div className="flex-1 flex items-center bg-muted/30 rounded-3xl px-4 h-10">
          {isRecording ? (
            <>
              <span className="text-xs text-red-500 font-mono mr-2">
                {Math.floor(recordingDuration / 60)}:
                {String(recordingDuration % 60).padStart(2, '0')}
              </span>
              <Waveform analyser={analyser} />
            </>
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/30"
              onFocus={() => {
                if (attachPanel) onToggleAttachPanel();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSend();
              }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-30 shrink-0 active:scale-90 transition-transform"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {attachPanel && (
        <div
          className="flex items-center justify-center bg-card border-t border-border/50 min-h-[200px]"
          style={{ height: 'var(--keyboard-height, 260px)' }}
        >
          <div className="grid grid-cols-4 gap-4 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                videoInputRef.current?.click();
                onToggleAttachPanel();
              }}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-neo-blue/10 border border-neo-blue/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-neo-blue" />
              </div>
              <span className="text-[10px] text-foreground/60">Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                imageInputRef.current?.click();
                onToggleAttachPanel();
              }}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-neo-green/10 border border-neo-green/20 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-neo-green" />
              </div>
              <span className="text-[10px] text-foreground/60">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                isRecording ? stopRecording() : startRecording();
                onToggleAttachPanel();
              }}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-neo-red/10 border border-neo-red/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-neo-red" />
              </div>
              <span className="text-[10px] text-foreground/60">Audio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onGifToggle();
                onToggleAttachPanel();
              }}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-neo-yellow/10 border border-neo-yellow/20 flex items-center justify-center">
                <span className="text-xs font-bold text-neo-yellow">GIF</span>
              </div>
              <span className="text-[10px] text-foreground/60">GIF</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
