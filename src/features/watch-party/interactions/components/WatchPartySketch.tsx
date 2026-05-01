import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
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
  Pipette,
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

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ffffff', // White
  '#a1a1aa', // Gray
  '#000000', // Black
];

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
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b-[4px] border-border shrink-0 flex items-center justify-between bg-background">
        <h3 className="text-sm font-black font-headline uppercase tracking-widest text-foreground flex items-center gap-2">
          <PenTool className="w-4 h-4 text-foreground stroke-[3px]" />
          {t('sketch.tools')}
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="neo-base"
            size="none"
            onClick={triggerUndo}
            className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-background text-foreground hover:bg-neo-yellow/80 font-black font-headline uppercase tracking-widest border-[3px] border-border"
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
            className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-background text-neo-blue hover:bg-neo-blue hover:text-primary-foreground font-black font-headline uppercase tracking-widest border-[3px] border-border"
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
              className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-neo-red text-primary-foreground hover:bg-primary font-black font-headline uppercase tracking-widest border-[3px] border-border"
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
          <h4 className="text-xs font-black text-foreground/50 uppercase tracking-widest font-headline">
            {t('sketch.toolsLabel')}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <Button
                  key={tool.id}
                  type="button"
                  title={t(tool.labelKey)}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 transition-colors border-[3px]',
                    isActive
                      ? 'bg-[var(--wp-send-btn,#ffcc00)] text-foreground border-border '
                      : 'bg-background text-foreground hover:bg-neo-yellow/80 border-border',
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[3px]" />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Fill Toggle & Visual Options */}
        {showFillToggle && (
          <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
            <h4 className="text-xs font-black text-foreground/50 uppercase tracking-widest font-headline flex items-center justify-between">
              {t('sketch.options')}
              {selectedId && (
                <div className="flex gap-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-reduce:animate-none">
                  <Button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'front')}
                    title={t('sketch.bringToFront')}
                    className="p-1 hover:bg-neo-yellow/80 border-[2px] border-border  transition-colors"
                  >
                    <MoveUp className="w-3 h-3 stroke-[3px]" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'back')}
                    title={t('sketch.sendToBack')}
                    className="p-1 hover:bg-neo-yellow/80 border-[2px] border-border  transition-colors"
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
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 border-[3px] font-black font-headline uppercase tracking-widest text-xs transition-colors',
                  isFilled
                    ? 'bg-primary text-primary-foreground border-border'
                    : 'bg-background text-foreground border-border hover:bg-background',
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
            <h4 className="text-xs font-black text-foreground/50 uppercase tracking-widest font-headline">
              {t('sketch.color')}
            </h4>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <Button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 transition-transform border-[3px] border-border',
                    color === c ? 'scale-125 ' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={t('sketch.selectColor', { color: c })}
                />
              ))}
              <Button
                type="button"
                onClick={() => customColorInputRef.current?.click()}
                className={cn(
                  'w-8 h-8 transition-transform flex items-center justify-center border-[3px] border-border bg-gradient-to-br from-red-500 via-green-500 to-blue-500',
                  !COLORS.includes(color) && color !== 'eraser'
                    ? 'scale-125 '
                    : 'hover:scale-110',
                )}
                title={t('sketch.customColor')}
              >
                <Pipette className="w-4 h-4 text-primary-foreground drop-shadow-md stroke-[3px]" />
                <input
                  ref={customColorInputRef}
                  type="color"
                  className="sr-only"
                  value={COLORS.includes(color) ? '#ffffff' : color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </Button>
            </div>
          </div>
        )}

        {/* Stroke Width / Font Size Slider */}
        <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black font-headline text-foreground/50 uppercase tracking-widest">
              {currentTool === 'text'
                ? t('sketch.fontSize')
                : t('sketch.thickness')}
            </h4>
            <span className="text-xs font-bold font-headline text-foreground/60 tracking-widest">
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
            className="w-full h-2 border-[2px] border-border bg-background accent-[#0055ff] appearance-none cursor-pointer"
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
            <h4 className="text-xs font-black font-headline text-foreground/50 uppercase tracking-widest">
              {t('sketch.opacity')}
            </h4>
            <span className="text-xs font-bold font-headline text-foreground/60 tracking-widest">
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
            className="w-full h-2 border-[2px] border-border bg-background accent-[#0055ff] appearance-none cursor-pointer"
            aria-label={t('sketch.opacity')}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t-[3px] border-border bg-background">
        <Button
          type="button"
          variant="neo"
          onClick={() => {
            const stage = stageRef.current;
            if (!stage) return;
            // Briefly reveal the video snapshot layer (hidden by default)
            const bgNode = stage.findOne('#video-snapshot-layer');
            if (bgNode) {
              bgNode.opacity(1);
              stage.batchDraw();
            }

            // Small timeout to allow Konva to paint the frame if needed
            setTimeout(() => {
              const dataUrl = stage.toDataURL({ pixelRatio: 2 });
              const link = document.createElement('a');
              link.download = `watch-party-sketch-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();

              if (bgNode) {
                bgNode.opacity(0);
                stage.batchDraw();
              }
            }, 50);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm bg-success hover:opacity-80 text-foreground"
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
                theme={appTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
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
