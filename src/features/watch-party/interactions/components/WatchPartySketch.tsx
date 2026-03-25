import {
  ArrowUpRight,
  Circle,
  Eraser,
  Minus,
  Pencil,
  PenTool,
  Pipette,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Zap,
} from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { type ToolType, useSketch } from '../context/SketchContext';

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
  { id: 'freehand', label: 'Pen', icon: PenTool },
  { id: 'pencil', label: 'Pencil', icon: Pencil },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rectangle', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'laser', label: 'Laser', icon: Zap },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
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
  } = useSketch();

  const customColorInputRef = useRef<HTMLInputElement>(null);

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
                  onClick={() => setCurrentTool(tool.id)}
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

        {/* Color Selection (hide when eraser is active) */}
        {currentTool !== 'eraser' && (
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
          />
        </div>
      </div>
    </div>
  );
}
