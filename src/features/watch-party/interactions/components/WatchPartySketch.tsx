import { EmojiStyle, Theme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-[350px] h-[400px] bg-card rounded-lg animate-pulse" />
  ),
});

import {
  ArrowUpRight,
  Camera,
  Circle,
  Eraser,
  MessageSquare,
  Minus,
  MousePointer2,
  MoveDown,
  MoveUp,
  Pencil,
  PenTool,
  Sparkles,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';
import { type ToolType, useSketch } from '../context/SketchContext';
import { useSketchOverlay } from '../hooks/use-sketch-overlay';

const TOOLS: { id: ToolType; labelKey: string; icon: React.ElementType }[] = [
  { id: 'select', labelKey: 'sketch.toolSelect', icon: MousePointer2 },
  { id: 'freehand', labelKey: 'sketch.toolPen', icon: PenTool },
  { id: 'pencil', labelKey: 'sketch.toolPencil', icon: Pencil },
  { id: 'arrow', labelKey: 'sketch.toolArrow', icon: ArrowUpRight },
  { id: 'line', labelKey: 'sketch.toolLine', icon: Minus },
  { id: 'rectangle', labelKey: 'sketch.toolBox', icon: Square },
  { id: 'circle', labelKey: 'sketch.toolCircle', icon: Circle },
  { id: 'triangle', labelKey: 'sketch.toolTriangle', icon: Triangle },
  { id: 'star', labelKey: 'sketch.toolStar', icon: Star },
  { id: 'bubble', labelKey: 'sketch.toolBubble', icon: MessageSquare },
  { id: 'text', labelKey: 'sketch.toolText', icon: Type },
  { id: 'laser', labelKey: 'sketch.toolLaser', icon: Zap },
  { id: 'eraser', labelKey: 'sketch.toolEraser', icon: Eraser },
  { id: 'reaction', labelKey: 'sketch.toolReaction', icon: Sparkles },
];

/**
 * Placeholder shown when the current user lacks sketch/draw permissions.
 */
export function WatchPartySketchDisabled() {
  const t = useTranslations('party');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground/50 space-y-4">
      <PenTool className="w-12 h-12 opacity-50 stroke-[3px]" />
      <div className="space-y-1">
        <h3 className="text-foreground font-black font-headline uppercase tracking-widest">
          {t('sketch.disabled')}
        </h3>
        <p className="text-sm">{t('sketch.disabledDescription')}</p>
      </div>
    </div>
  );
}

/**
 * Sketch tool panel rendered in the watch party sidebar.
 *
 * Provides tool selection (freehand, pencil, shapes, text, laser, eraser,
 * sticker, reaction), colour picker, stroke width / font size slider,
 * opacity slider, fill toggle, undo/clear actions, z-order controls,
 * and a "Capture Scene" button that exports the Konva stage as a PNG.
 */
export function WatchPartySketch() {
  const {
    currentTool,
    setCurrentTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    triggerClear,
    triggerClearSelf,
    triggerUndo,
    isHost,
    isFilled,
    setIsFilled,
    setSelectedSticker,
    opacity,
    setOpacity,
    selectedId,
    stageRef,
    videoRef,
  } = useSketch();

  const { handleMoveZ } = useSketchOverlay();
  const { theme: appTheme } = useTheme();
  const t = useTranslations('party');

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const customColorInputRef = useRef<HTMLInputElement>(null);

  const handleToolClick = (toolId: ToolType) => {
    if (toolId === 'sticker' || toolId === 'reaction') {
      setIsEmojiPickerOpen(true);
    } else {
      setCurrentTool(toolId);
    }
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setSelectedSticker(emojiData.emoji);
    setCurrentTool('sticker');
    setIsEmojiPickerOpen(false);
  };

  const showColorPicker = !['eraser', 'select'].includes(currentTool);
  const showFillToggle = [
    'rectangle',
    'circle',
    'triangle',
    'star',
    'text',
    'bubble',
  ].includes(currentTool);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/20 dark:border-white/10 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-black font-headline uppercase tracking-widest text-foreground dark:text-white flex items-center gap-2">
          <PenTool className="w-4 h-4 text-foreground/60 dark:text-white/60 stroke-[3px]" />
          {t('sketch.tools')}
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={triggerUndo}
            className="text-[10px] flex items-center gap-1.5 px-2 py-1 text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 font-bold rounded-md transition-colors"
            title={t('sketch.undoTitle')}
          >
            <Undo2 className="w-3.5 h-3.5 stroke-[3px]" />
            <span className="hidden xl:inline">{t('sketch.undo')}</span>
          </Button>

          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={triggerClearSelf}
            className="text-[10px] flex items-center gap-1.5 px-2 py-1 text-blue-400 hover:text-blue-300 hover:bg-foreground/10 dark:hover:bg-white/10 font-bold rounded-md transition-colors"
            title={t('sketch.clearMineTitle')}
          >
            <Eraser className="w-3.5 h-3.5 stroke-[3px]" />
            <span className="hidden xl:inline">{t('sketch.clearMine')}</span>
          </Button>

          {isHost && (
            <Button
              type="button"
              variant="neo-base"
              size="none"
              onClick={triggerClear}
              className="text-[10px] flex items-center gap-1.5 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-foreground/10 dark:hover:bg-white/10 font-bold rounded-md transition-colors"
              title={t('sketch.clearAllTitle')}
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[3px]" />
              <span className="hidden xl:inline">{t('sketch.clearAll')}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {/* Tool Selection */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground/40 dark:text-white/40 uppercase tracking-widest">
            {t('sketch.toolsLabel')}
          </h4>
          <div className="grid grid-cols-7 gap-1">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  title={t(tool.labelKey)}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    'flex items-center justify-center p-2',
                    isActive ? 'text-white' : 'text-white/40 hover:text-white',
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[3px]" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Fill Toggle & Visual Options */}
        {showFillToggle && (
          <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
            <h4 className="text-xs font-bold text-foreground/40 dark:text-white/40 uppercase tracking-widest flex items-center justify-between">
              {t('sketch.options')}
              {selectedId && (
                <div className="flex gap-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-reduce:animate-none">
                  <Button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'front')}
                    title={t('sketch.bringToFront')}
                    className="p-1 text-foreground/60 hover:text-foreground dark:text-white/60 dark:hover:text-white transition-colors"
                  >
                    <MoveUp className="w-3 h-3 stroke-[3px]" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'back')}
                    title={t('sketch.sendToBack')}
                    className="p-1 text-foreground/60 hover:text-foreground dark:text-white/60 dark:hover:text-white transition-colors"
                  >
                    <MoveDown className="w-3 h-3 stroke-[3px]" />
                  </Button>
                </div>
              )}
            </h4>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setIsFilled(!isFilled)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 font-bold text-xs transition-colors rounded-lg',
                  isFilled
                    ? 'bg-white/20 text-foreground dark:text-white'
                    : 'text-foreground/60 hover:bg-foreground/10 dark:text-white/60 dark:hover:bg-white/10',
                )}
              >
                {isFilled ? t('sketch.filledShape') : t('sketch.outlineOnly')}
              </Button>
            </div>
          </div>
        )}

        {/* Color Selection */}
        {showColorPicker && (
          <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
            <h4 className="text-xs font-bold text-foreground/40 dark:text-white/40 uppercase tracking-widest">
              {t('sketch.color')}
            </h4>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => customColorInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full cursor-pointer"
                style={{
                  background:
                    'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                }}
                title={t('sketch.customColor')}
              >
                <div
                  className="absolute inset-4 rounded-full border-2 border-white/30"
                  style={{ backgroundColor: color }}
                />
                <input
                  ref={customColorInputRef}
                  type="color"
                  className="sr-only"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </button>
            </div>
          </div>
        )}

        {/* Stroke Width / Font Size Slider */}
        <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground/40 dark:text-white/40 uppercase tracking-widest">
              {currentTool === 'text'
                ? t('sketch.fontSize')
                : t('sketch.thickness')}
            </h4>
            <span className="text-xs font-bold text-foreground/50 dark:text-white/50">
              {currentTool === 'text'
                ? `${strokeWidth * 4}px`
                : `${strokeWidth}px`}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full h-1.5 bg-foreground/20 dark:bg-white/20 rounded-full accent-foreground dark:accent-white appearance-none cursor-pointer"
            aria-label={
              currentTool === 'text'
                ? t('sketch.fontSize')
                : t('sketch.thickness')
            }
          />
        </div>

        {/* Opacity Slider */}
        <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground/40 dark:text-white/40 uppercase tracking-widest">
              {t('sketch.opacity')}
            </h4>
            <span className="text-xs font-bold text-foreground/50 dark:text-white/50">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full h-1.5 bg-foreground/20 dark:bg-white/20 rounded-full accent-foreground dark:accent-white appearance-none cursor-pointer"
            aria-label={t('sketch.opacity')}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/20 dark:border-white/10">
        <Button
          type="button"
          variant="neo"
          onClick={async () => {
            const stage = stageRef.current;
            const video = videoRef.current;
            if (!stage) return;

            // Capture video frame onto an offscreen canvas
            const canvas = document.createElement('canvas');
            canvas.width = stage.width() * 2;
            canvas.height = stage.height() * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw video frame as background
            if (video) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            // Draw sketch overlay on top
            const sketchDataUrl = stage.toDataURL({ pixelRatio: 2 });
            const sketchImg = new Image();
            sketchImg.src = sketchDataUrl;
            await new Promise((r) => {
              sketchImg.onload = r;
            });
            ctx.drawImage(sketchImg, 0, 0, canvas.width, canvas.height);

            const finalDataUrl = canvas.toDataURL('image/jpeg', 0.85);

            // Save to library via API
            try {
              const { saveScreenshot } = await import('@/features/clips/api');
              await saveScreenshot(finalDataUrl, `Scene Capture`);
              const { toast } = await import('sonner');
              toast.success(t('sketch.captureSuccess'));
            } catch {
              const { toast } = await import('sonner');
              toast.error(t('sketch.captureFailed'));
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-foreground/10 hover:bg-foreground/20 text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-white rounded-lg transition-colors"
        >
          <Camera className="w-5 h-5 stroke-[3px]" />
          {t('sketch.captureScene')}
        </Button>
      </div>

      {/* Emoji Picker Overlay */}
      {isEmojiPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
            <Button
              type="button"
              onClick={() => setIsEmojiPickerOpen(false)}
              className="absolute -top-12 right-0 px-4 py-2 bg-background border-[3px] border-border  font-black text-xs uppercase tracking-widest hover:bg-neo-yellow/80 transition-colors"
            >
              {t('sketch.close')}
            </Button>
            <div className="border-[4px] border-border ">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={
                  appTheme === 'dark' ||
                  (appTheme === 'system' &&
                    typeof window !== 'undefined' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches)
                    ? Theme.DARK
                    : Theme.LIGHT
                }
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis={true}
                searchPlaceHolder={t('sketch.searchStickers')}
                width={320}
                height={400}
                skinTonesDisabled
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
