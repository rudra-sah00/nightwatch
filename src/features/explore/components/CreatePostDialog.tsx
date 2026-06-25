'use client';

import { Theme } from 'emoji-picker-react';
import { ImagePlus, SmilePlus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  createPost,
  type GifResult,
  searchGifs,
  uploadExploreMedia,
} from '@/features/explore/api';
import { useTagSearch } from '@/features/explore/hooks/use-tag-search';
import {
  MAX_CONTENT_LENGTH,
  MAX_GIFS,
  MAX_IMAGES,
  useComposerStore,
} from '@/features/explore/store/use-composer-store';
import type { ExplorePost, PostTag } from '@/features/explore/types';
import { SLASH_COMMANDS } from '@/features/explore/types';
import { searchUsers } from '@/features/friends/api';
import { trackEvent } from '@/lib/analytics';
import { useTheme } from '@/providers/theme-provider';
import { TagChip } from './TagChip';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface CreatePostDialogProps {
  onClose: () => void;
  onCreated: (post: ExplorePost) => void;
}

const AI_MENTION = {
  userId: 'nightwatch-ai',
  username: 'nightwatch',
  name: 'Nightwatch AI',
};

export function CreatePostDialog({
  onClose,
  onCreated,
}: CreatePostDialogProps) {
  const { theme: appTheme } = useTheme();
  const isDark =
    appTheme === 'dark' ||
    (appTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [slashCommand, setSlashCommand] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<
    {
      id: string;
      name: string;
      username: string | null;
      profilePhoto: string | null;
    }[]
  >([]);

  const store = useComposerStore();
  const { results: tagResults, isSearching } = useTagSearch(
    slashCommand
      ? SLASH_COMMANDS.find((c) => c.command === slashCommand)?.tagType || null
      : null,
    slashQuery,
  );

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    inputRef.current?.focus();
    return () => {
      store.reset();
    };
  }, [store.reset]);

  // @mention search
  useEffect(() => {
    if (!mentionActive || mentionQuery.length < 1) {
      setMentionResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setMentionResults(await searchUsers(mentionQuery));
    }, 300);
    return () => clearTimeout(t);
  }, [mentionActive, mentionQuery]);

  // GIF search (trending on open, search on type)
  useEffect(() => {
    if (!gifOpen) return;
    const t = setTimeout(
      async () => {
        setGifResults(await searchGifs(gifQuery || undefined));
      },
      gifQuery ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [gifOpen, gifQuery]);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleContentChange = (text: string) => {
    store.setContent(text);
    // Detect / commands
    const slashMatch = text.match(/^\/(\w+)\s*(.*)/);
    const validCmds: string[] = SLASH_COMMANDS.map((c) => c.command);
    if (slashMatch && validCmds.includes(`/${slashMatch[1]}`)) {
      setSlashCommand(`/${slashMatch[1]}`);
      setSlashQuery(slashMatch[2] || '');
    } else if (text === '/') {
      setSlashCommand(null);
      setSlashQuery('');
    } else {
      setSlashCommand(null);
      setSlashQuery('');
    }
    // Detect @mention
    const mentionMatch = text.match(/@(\w*)$/);
    setMentionActive(!!mentionMatch);
    setMentionQuery(mentionMatch?.[1] || '');
  };

  const handleTagSelect = (tag: PostTag) => {
    store.addTag(tag);
    store.setContent('');
    setSlashCommand(null);
    setSlashQuery('');
    trackEvent('explore_tag_select', { type: tag.type });
  };

  const handleMentionSelect = (user: {
    userId: string;
    username: string;
    name: string;
  }) => {
    const newContent = store.content.replace(/@\w*$/, `@${user.username} `);
    store.setContent(newContent);
    setMentionActive(false);
    trackEvent('explore_mention_select', { username: user.username });
  };

  const handleSubmit = async () => {
    if (!store.canSubmit()) return;
    store.setSubmitting(true);
    try {
      const post = await createPost({
        content: store.content,
        type: store.images.length || store.gifs.length ? 'media' : 'text',
        tags: store.tags,
        media: store.getMedia(),
      });
      trackEvent('explore_post_create', { type: post.type });
      toast.success('Posted!');
      onCreated(post);
      store.reset();
      close();
    } catch {
      toast.error('Failed to post');
    } finally {
      store.setSubmitting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    store.setUploading(true);
    try {
      const urls = await uploadExploreMedia(
        files.slice(0, MAX_IMAGES - store.images.length),
      );
      store.addImages(urls);
    } catch {
      toast.error('Upload failed');
    } finally {
      store.setUploading(false);
    }
  };

  const handleGifSelect = useCallback(
    (gif: GifResult) => {
      store.addGif(gif.url);
      if (store.gifs.length + 1 >= MAX_GIFS) setGifOpen(false);
      trackEvent('explore_gif_select');
    },
    [store],
  );

  const showSlashMenu = store.content === '/';
  const showAiInMentions =
    mentionActive &&
    (mentionQuery.length === 0 ||
      'nightwatch'.startsWith(mentionQuery.toLowerCase()));
  const totalMedia = store.images.length + store.gifs.length;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-all duration-200 ${visible ? 'bg-black/70 backdrop-blur-md opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex-1 flex flex-col justify-center overflow-y-auto p-4 sm:p-8 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <div className="w-full max-w-md mx-auto space-y-4">
          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="self-start text-white/40 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={slashCommand ? slashQuery : store.content}
            onChange={(e) => {
              if (slashCommand) {
                store.setContent(`${slashCommand} ${e.target.value}`);
                setSlashQuery(e.target.value);
              } else {
                handleContentChange(e.target.value);
              }
            }}
            placeholder={
              slashCommand
                ? `Search ${slashCommand.slice(1)}...`
                : 'Share something...'
            }
            className="w-full bg-transparent outline-none text-lg text-white placeholder:text-white/25 resize-none min-h-[100px] max-h-[200px] leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Backspace' && slashCommand && slashQuery === '') {
                e.preventDefault();
                store.setContent('');
                setSlashCommand(null);
              }
            }}
          />

          {/* Command chip */}
          {slashCommand && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary bg-primary/20 px-3 py-1 rounded-full">
                {slashCommand}
              </span>
              <button
                type="button"
                onClick={() => {
                  store.setContent('');
                  setSlashCommand(null);
                }}
                className="text-white/30 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tags */}
          {store.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {store.tags.map((tag) => (
                <div
                  key={`${tag.type}-${tag.id}`}
                  className="flex items-center gap-1"
                >
                  <TagChip tag={tag} />
                  <button
                    type="button"
                    onClick={() => store.removeTag(tag.id, tag.type)}
                    className="text-white/30 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media grid (images + GIFs) */}
          {totalMedia > 0 && (
            <div
              className={`grid gap-2 ${totalMedia === 1 ? 'grid-cols-1' : totalMedia === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
            >
              {[...store.images, ...store.gifs].map((url) => (
                <div
                  key={url}
                  className="relative rounded-xl overflow-hidden aspect-video"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      store.removeImage(url);
                      store.removeGif(url);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-black/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Slash command results */}
          {slashCommand && slashQuery.length >= 2 && (
            <div className="max-h-[180px] overflow-y-auto rounded-xl bg-white/5 border border-white/10">
              {isSearching && (
                <div className="px-4 py-3 text-xs text-white/40 text-center">
                  Searching...
                </div>
              )}
              {tagResults.map((tag) => (
                <button
                  key={`${tag.type}-${tag.id}`}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 text-left"
                >
                  {tag.image ? (
                    <Image
                      src={tag.image}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : null}
                  <span className="text-sm text-white truncate">
                    {tag.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Slash menu */}
          {showSlashMenu && (
            <div className="rounded-xl bg-white/5 border border-white/10">
              {SLASH_COMMANDS.map((cmd) => (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => {
                    store.setContent(`${cmd.command} `);
                    setSlashCommand(cmd.command);
                    setSlashQuery('');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 text-left"
                >
                  <span className="text-xs font-mono text-primary">
                    {cmd.command}
                  </span>
                  <span className="text-sm text-white/50">{cmd.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* @mention */}
          {mentionActive && (
            <div className="max-h-[160px] overflow-y-auto rounded-xl bg-white/5 border border-white/10">
              {showAiInMentions && (
                <button
                  type="button"
                  onClick={() => handleMentionSelect(AI_MENTION)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                    AI
                  </div>
                  <span className="text-sm text-white font-bold">
                    Nightwatch AI
                  </span>
                  <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded ml-auto">
                    BOT
                  </span>
                </button>
              )}
              {mentionResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    handleMentionSelect({
                      userId: u.id,
                      username: u.username || u.name,
                      name: u.name,
                    })
                  }
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden">
                    {u.profilePhoto ? (
                      <Image
                        src={u.profilePhoto}
                        alt=""
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-white/60 font-bold">
                        {u.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-white">{u.name}</span>
                  {u.username && (
                    <span className="text-xs text-white/30">@{u.username}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* GIF picker */}
          {gifOpen && (
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/10">
                <input
                  type="text"
                  value={gifQuery}
                  onChange={(e) => setGifQuery(e.target.value)}
                  placeholder="Search GIFs..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
                <img
                  src="/giphy-attribution.svg"
                  alt="Powered by GIPHY"
                  className="h-3.5 ml-2 opacity-60"
                />
              </div>
              <div className="max-h-[180px] overflow-y-auto p-2 grid grid-cols-3 gap-1.5">
                {gifResults.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleGifSelect(gif)}
                    className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary"
                  >
                    <Image
                      src={gif.preview}
                      alt={gif.title}
                      width={100}
                      height={70}
                      className="w-full h-16 object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji */}
          {emojiOpen && (
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <EmojiPicker
                theme={isDark ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={(d) => {
                  store.setContent(store.content + d.emoji);
                  setEmojiOpen(false);
                }}
                lazyLoadEmojis
                height={280}
                width="100%"
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={store.isUploading || store.images.length >= MAX_IMAGES}
              className="text-white/40 hover:text-white disabled:text-white/10 transition-colors"
              title={`Images (${store.images.length}/${MAX_IMAGES})`}
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setGifOpen(!gifOpen);
                setEmojiOpen(false);
              }}
              disabled={store.gifs.length >= MAX_GIFS}
              className={`text-xs font-bold transition-colors ${gifOpen ? 'text-primary' : 'text-white/40 hover:text-white'} disabled:text-white/10`}
              title={`GIFs (${store.gifs.length}/${MAX_GIFS})`}
            >
              GIF
            </button>
            <button
              type="button"
              onClick={() => {
                setEmojiOpen(!emojiOpen);
                setGifOpen(false);
              }}
              className={`transition-colors ${emojiOpen ? 'text-primary' : 'text-white/40 hover:text-white'}`}
            >
              <SmilePlus className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <span
              className={`ml-auto text-[11px] font-mono ${store.content.length > 450 ? 'text-red-400' : 'text-white/20'}`}
            >
              {store.content.length}/{MAX_CONTENT_LENGTH}
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!store.canSubmit()}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-headline font-bold disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
