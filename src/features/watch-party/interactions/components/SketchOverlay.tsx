import { useEffect, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Text,
} from 'react-konva';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { useSketch } from '../context/SketchContext';
import { useSketchOverlay } from '../hooks/use-sketch-overlay';

interface SketchOverlayProps {
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

export function SketchOverlay({
  rtmSendMessage,
  rtmSendMessageToPeer,
  userId,
  userName,
}: SketchOverlayProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    actions,
    containerRef,
    stageSize,
    isSketchMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    pendingText,
    confirmText,
    cancelText,
  } = useSketchOverlay({
    rtmSendMessage,
    rtmSendMessageToPeer,
    userId,
    userName,
  });

  const { color, strokeWidth, currentTool } = useSketch();

  useEffect(() => {
    if (pendingText) {
      setInputValue('');
      // Defer focus so the element is painted first
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [pendingText]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        confirmText(inputValue.trim());
      } else {
        cancelText();
      }
      setInputValue('');
    } else if (e.key === 'Escape') {
      cancelText();
      setInputValue('');
    }
  };

  const handleInputBlur = () => {
    // Small delay so Enter keydown can fire confirmText before blur dismisses
    setTimeout(() => {
      cancelText();
      setInputValue('');
    }, 120);
  };

  const canvasCursor =
    isSketchMode && !pendingText
      ? currentTool === 'text'
        ? 'text'
        : 'crosshair'
      : 'default';

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-40 ${isSketchMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ cursor: canvasCursor }}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        listening={!pendingText}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          {actions.map((action) => {
            const { id, type, data, color, strokeWidth } = action;

            // Note: In a production app, we would apply globalCompositeOperation='destination-out' for the real eraser.
            // Here, we just use globalCompositeOperation if color === 'eraser'.

            if (type === 'freehand' || type === 'pencil') {
              return (
                <Line
                  key={id}
                  points={data}
                  stroke={color === 'eraser' ? 'rgba(0,0,0,1)' : color}
                  strokeWidth={
                    type === 'pencil' ? strokeWidth * 0.5 : strokeWidth
                  }
                  opacity={type === 'pencil' ? 0.7 : 1}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    color === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              );
            }

            if (
              [
                'line',
                'arrow',
                'rectangle',
                'circle',
                'triangle',
                'star',
              ].includes(type)
            ) {
              if (data.length < 4) return null; // Needs at least start and end points for shapes
            }
            const [x1, y1, x2, y2] = data;

            if (type === 'line') {
              return (
                <Line
                  key={id}
                  points={[x1, y1, x2, y2]}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  lineCap="round"
                />
              );
            }
            if (type === 'arrow') {
              return (
                <Arrow
                  key={id}
                  points={[x1, y1, x2, y2]}
                  stroke={color}
                  fill={color}
                  strokeWidth={strokeWidth}
                  pointerLength={10 + strokeWidth * 2}
                  pointerWidth={10 + strokeWidth * 2}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            if (type === 'rectangle') {
              return (
                <Rect
                  key={id}
                  x={Math.min(x1, x2)}
                  y={Math.min(y1, y2)}
                  width={Math.abs(x2 - x1)}
                  height={Math.abs(y2 - y1)}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  lineJoin="round"
                />
              );
            }
            if (type === 'circle') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <Circle
                  key={id}
                  x={x1 + (x2 - x1) / 2}
                  y={y1 + (y2 - y1) / 2}
                  radius={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                />
              );
            }
            if (type === 'triangle') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <RegularPolygon
                  key={id}
                  sides={3}
                  radius={radius}
                  x={x1 + (x2 - x1) / 2}
                  y={y1 + (y2 - y1) / 2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  rotation={(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90}
                />
              );
            }
            if (type === 'star') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <Star
                  key={id}
                  numPoints={5}
                  innerRadius={radius / 2}
                  outerRadius={radius}
                  x={x1 + (x2 - x1) / 2}
                  y={y1 + (y2 - y1) / 2}
                  stroke={color}
                  fill={color}
                  strokeWidth={strokeWidth}
                  rotation={(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90}
                />
              );
            }
            if (type === 'laser') {
              return (
                <Line
                  key={id}
                  points={data}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.8}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  dash={[10, 5]}
                />
              );
            }
            if (type === 'text') {
              return (
                <Text
                  key={id}
                  x={data[0]}
                  y={data[1]}
                  text={action.text || ''}
                  fill={color}
                  fontSize={strokeWidth * 4}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>

      {/* Custom text input — replaces native browser prompt() */}
      {pendingText && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{ left: pendingText.x, top: pendingText.y }}
        >
          <div className="flex flex-col gap-1.5 -translate-y-1/2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              placeholder="Type text..."
              className="bg-black/85 backdrop-blur-sm placeholder-white/30 outline-none px-3 py-1.5 min-w-[140px] max-w-[260px] rounded-lg border-2 shadow-xl shadow-black/60 font-bold"
              style={{
                borderColor: color,
                color: color,
                fontSize: `${Math.max(14, strokeWidth * 4)}px`,
              }}
            />
            <div className="flex gap-1.5 px-0.5">
              <span className="bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                ↵ place
              </span>
              <span className="bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                Esc cancel
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
