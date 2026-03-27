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
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
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

const TOOLS: { id: ToolType; label: string; icon: React.ElementType }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'freehand', label: 'Pen', icon: PenTool },
  { id: 'pencil', label: 'Pencil', icon: Pencil },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rectangle', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'bubble', label: 'Bubble', icon: MessageSquare },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'laser', label: 'Laser', icon: Zap },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'reaction', label: 'Reaction', icon: Sparkles },
];

export function WatchPartySketchDisabled() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#1a1a1a]/50 space-y-4">
      <PenTool className="w-12 h-12 opacity-50 stroke-[3px]" />
      <div className="space-y-1">
        <h3 className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest">
          Sketching Disabled
        </h3>
        <p className="text-sm">The host has disabled drawing for guests.</p>
      </div>
    </div>
  );
}

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

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const customColorInputRef = useRef<HTMLInputElement>(null);

  const handleToolClick = (toolId: ToolType) => {
    if (toolId === 'sticker') {
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
    <div className="flex flex-col h-full bg-[#f5f0e8]">
      <div className="p-4 border-b-[4px] border-[#1a1a1a] shrink-0 flex items-center justify-between bg-white">
        <h3 className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2">
          <PenTool className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
          Sketch Tools
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={triggerUndo}
            className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#1a1a1a] hover:bg-[#ffe066] transition-colors font-black font-headline uppercase tracking-widest border-[3px] border-[#1a1a1a] neo-shadow-sm"
            title="Undo last action"
          >
            <Undo2 className="w-3.5 h-3.5 stroke-[3px]" />
            <span className="hidden xl:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={triggerClearSelf}
            className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0055ff] hover:bg-[#0055ff] hover:text-white transition-colors font-black font-headline uppercase tracking-widest border-[3px] border-[#1a1a1a] neo-shadow-sm"
            title="Clear only your drawings"
          >
            <Eraser className="w-3.5 h-3.5 stroke-[3px]" />
            <span className="hidden xl:inline">Clear Mine</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={triggerClear}
              className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-[#e63b2e] text-white hover:bg-[#1a1a1a] transition-colors font-black font-headline uppercase tracking-widest border-[3px] border-[#1a1a1a] neo-shadow-sm"
              title="Host only: Clear everything"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[3px]" />
              <span className="hidden xl:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {/* Tool Selection */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-[#1a1a1a]/50 uppercase tracking-widest font-headline">
            Tools
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 transition-colors border-[3px]',
                    isActive
                      ? 'bg-[var(--wp-send-btn,#ffcc00)] text-[#1a1a1a] border-[#1a1a1a] neo-shadow-sm'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#ffe066] border-[#1a1a1a]',
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
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xs font-black text-[#1a1a1a]/50 uppercase tracking-widest font-headline flex items-center justify-between">
              Options
              {selectedId && (
                <div className="flex gap-1 animate-in fade-in slide-in-from-right-4">
                  <button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'front')}
                    title="Bring to Front"
                    className="p-1 hover:bg-[#ffe066] border-[2px] border-[#1a1a1a] neo-shadow-sm transition-colors"
                  >
                    <MoveUp className="w-3 h-3 stroke-[3px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveZ(selectedId, 'back')}
                    title="Send to Back"
                    className="p-1 hover:bg-[#ffe066] border-[2px] border-[#1a1a1a] neo-shadow-sm transition-colors"
                  >
                    <MoveDown className="w-3 h-3 stroke-[3px]" />
                  </button>
                </div>
              )}
            </h4>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFilled(!isFilled)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 border-[3px] font-black font-headline uppercase tracking-widest text-xs transition-colors',
                  isFilled
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#f5f0e8]',
                )}
              >
                {isFilled ? 'Filled Shape' : 'Outline Only'}
              </button>
            </div>
          </div>
        )}

        {/* Color Selection */}
        {showColorPicker && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xs font-black text-[#1a1a1a]/50 uppercase tracking-widest font-headline">
              Color
            </h4>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 transition-transform border-[3px] border-[#1a1a1a]',
                    color === c ? 'scale-125 neo-shadow-sm' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => customColorInputRef.current?.click()}
                className={cn(
                  'w-8 h-8 transition-transform flex items-center justify-center border-[3px] border-[#1a1a1a] bg-gradient-to-br from-red-500 via-green-500 to-blue-500',
                  !COLORS.includes(color) && color !== 'eraser'
                    ? 'scale-125 neo-shadow-sm'
                    : 'hover:scale-110',
                )}
                title="Custom Color"
              >
                <Pipette className="w-4 h-4 text-white drop-shadow-md stroke-[3px]" />
                <input
                  ref={customColorInputRef}
                  type="color"
                  className="sr-only"
                  value={COLORS.includes(color) ? '#ffffff' : color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </button>
            </div>
          </div>
        )}

        {/* Stroke Width / Font Size Slider */}
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black font-headline text-[#1a1a1a]/50 uppercase tracking-widest">
              {currentTool === 'text' ? 'Font Size' : 'Thickness'}
            </h4>
            <span className="text-xs font-bold font-headline text-[#1a1a1a]/60 tracking-widest">
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
            className="w-full h-2 border-[2px] border-[#1a1a1a] bg-white accent-[#0055ff] appearance-none cursor-pointer"
            aria-label={currentTool === 'text' ? 'Font Size' : 'Thickness'}
          />
        </div>

        {/* Opacity Slider */}
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black font-headline text-[#1a1a1a]/50 uppercase tracking-widest">
              Opacity
            </h4>
            <span className="text-xs font-bold font-headline text-[#1a1a1a]/60 tracking-widest">
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
            className="w-full h-2 border-[2px] border-[#1a1a1a] bg-white accent-[#0055ff] appearance-none cursor-pointer"
            aria-label="Opacity"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
        <button
          type="button"
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#00ff88] text-[#1a1a1a] border-[3px] border-[#1a1a1a] neo-shadow-sm font-black font-headline uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] hover:neo-shadow-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:neo-shadow-none"
        >
          <Camera className="w-5 h-5 stroke-[3px]" />
          Capture Scene
        </button>
      </div>

      {/* Emoji Picker Overlay */}
      {isEmojiPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(false)}
              className="absolute -top-12 right-0 px-4 py-2 bg-white border-[3px] border-[#1a1a1a] neo-shadow-sm font-black text-xs uppercase tracking-widest hover:bg-[#ffe066] transition-colors"
            >
              Close
            </button>
            <div className="border-[4px] border-[#1a1a1a] neo-shadow shadow-[#000000]">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search stickers..."
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
