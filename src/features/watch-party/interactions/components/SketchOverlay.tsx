import type Konva from 'konva';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Group,
  Image,
  Label,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Tag,
  Text,
  Transformer,
} from 'react-konva';
import { onSketchReaction } from '@/features/watch-party/room/services/watch-party.api';
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
  const transformerRef = useRef<Konva.Transformer>(null);
  const t = useTranslations('party');

  const {
    actions,
    containerRef,
    stageSize,
    isSketchMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTransformEnd,
    pendingText,
    confirmText,
    cancelText,
    selectedId,
    setSelectedId,
  } = useSketchOverlay({
    rtmSendMessage,
    rtmSendMessageToPeer,
    userId,
    userName,
  });

  const [guides, setGuides] = useState<
    Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>
  >([]);

  const [activeReactions, setActiveReactions] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      color: string;
      particles: Array<{
        id: string;
        x: number;
        y: number;
        vx: number;
        vy: number;
        opacity: number;
        scale: number;
      }>;
    }>
  >([]);

  const { color, strokeWidth, currentTool, cursors, stageRef, videoRef } =
    useSketch();

  useEffect(() => {
    if (pendingText) {
      setInputValue('');
      // Defer focus so the element is painted first
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [pendingText]);

  // Handle transformer selection
  useEffect(() => {
    if (isSketchMode && currentTool === 'select' && selectedId) {
      const stage = transformerRef.current?.getStage();
      const selectedNode = stage?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current?.nodes([selectedNode]);
        transformerRef.current?.getLayer()?.batchDraw();
      }
    }
  }, [isSketchMode, currentTool, selectedId]);

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

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const layer = e.target.getLayer();
    if (!layer) return;

    // Clear old guides
    setGuides([]);

    const SNAP_THRESHOLD = 10;
    const item = e.target;
    const itemBox = item.getClientRect();
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const newGuides: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];

    // Potential snapping points [guide_pos, snap_to_pos]
    const snapPointsX: Array<[number, number]> = [
      [stageWidth / 2, stageWidth / 2], // Stage Center X
    ];
    const snapPointsY: Array<[number, number]> = [
      [stageHeight / 2, stageHeight / 2], // Stage Center Y
    ];

    // Add other nodes' edges to snapping points
    layer.children?.forEach((child) => {
      if (child === item || child === transformerRef.current) return;
      const box = child.getClientRect();
      // X points: left, center, right
      snapPointsX.push([box.x, box.x]);
      snapPointsX.push([box.x + box.width / 2, box.x + box.width / 2]);
      snapPointsX.push([box.x + box.width, box.x + box.width]);
      // Y points: top, center, bottom
      snapPointsY.push([box.y, box.y]);
      snapPointsY.push([box.y + box.height / 2, box.y + box.height / 2]);
      snapPointsY.push([box.y + box.height, box.y + box.height]);
    });

    let snappedX = false;
    let snappedY = false;

    // Check X snaps (moving item's left, center, right)
    const itemPointsX = [
      itemBox.x,
      itemBox.x + itemBox.width / 2,
      itemBox.x + itemBox.width,
    ];
    for (const itemX of itemPointsX) {
      for (const [guideX, snapTo] of snapPointsX) {
        if (Math.abs(itemX - guideX) < SNAP_THRESHOLD) {
          const offset = itemX - item.x();
          item.x(snapTo - offset);
          newGuides.push({
            id: `guide-x-${guideX}`,
            x1: guideX,
            y1: 0,
            x2: guideX,
            y2: stageHeight,
          });
          snappedX = true;
          break;
        }
      }
      if (snappedX) break;
    }

    // Check Y snaps (moving item's top, center, bottom)
    const itemPointsY = [
      itemBox.y,
      itemBox.y + itemBox.height / 2,
      itemBox.y + itemBox.height,
    ];
    for (const itemY of itemPointsY) {
      for (const [guideY, snapTo] of snapPointsY) {
        if (Math.abs(itemY - guideY) < SNAP_THRESHOLD) {
          const offset = itemY - item.y();
          item.y(snapTo - offset);
          newGuides.push({
            id: `guide-y-${guideY}`,
            x1: 0,
            y1: guideY,
            x2: stageWidth,
            y2: guideY,
          });
          snappedY = true;
          break;
        }
      }
      if (snappedY) break;
    }

    setGuides(newGuides);
  }, []);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setGuides([]);
      handleTransformEnd(e);
    },
    [handleTransformEnd],
  );

  const canvasCursor =
    isSketchMode && !pendingText
      ? currentTool === 'text'
        ? 'text'
        : currentTool === 'select'
          ? 'default'
          : currentTool === 'reaction'
            ? 'cell'
            : 'crosshair'
      : 'default';

  // Reaction Listener
  useEffect(() => {
    return onSketchReaction((data) => {
      const numParticles = 12;
      const particles = Array.from({ length: numParticles }).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        opacity: 1,
        scale: 1,
      }));

      const id = Math.random().toString(36).substr(2, 9);
      setActiveReactions((prev) => [
        ...prev,
        { id, x: data.x, y: data.y, color: data.color, particles },
      ]);

      // Simple cleanup
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    });
  }, []);

  // Particle Animation Loop
  useEffect(() => {
    if (activeReactions.length === 0) return;

    let animFrame: number;
    const update = () => {
      setActiveReactions((prev) =>
        prev.map((reaction) => ({
          ...reaction,
          particles: reaction.particles.map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2, // gravity
            opacity: Math.max(0, p.opacity - 0.02),
            scale: Math.max(0, p.scale - 0.01),
          })),
        })),
      );
      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [activeReactions.length]);

  const isDraggable = isSketchMode && currentTool === 'select';

  const [bgImage, setBgImage] = useState<HTMLVideoElement | null>(null);

  // Poll video for background capture
  useEffect(() => {
    if (stageRef?.current && videoRef?.current) {
      setBgImage(videoRef.current);
    }
  }, [stageRef, videoRef]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-40 ${isSketchMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ cursor: canvasCursor }}
    >
      <Stage
        ref={stageRef}
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
          {bgImage && (
            <Image
              image={bgImage}
              width={stageSize.width}
              height={stageSize.height}
              listening={false}
              opacity={0} // Hidden normally, Konva will still capture it if we force draw or handle capture correctly
              id="video-snapshot-layer"
            />
          )}
        </Layer>
        <Layer>
          {actions.map((action) => {
            const { id, type, data, color, strokeWidth, fill } = action;

            const commonProps = {
              id,
              draggable: isDraggable && action.userId === userId,
              onClick: () => isDraggable && setSelectedId(id),
              onTap: () => isDraggable && setSelectedId(id),
              onDragMove: handleDragMove,
              onDragEnd: handleDragEnd,
              onTransformEnd: handleTransformEnd,
              x: action.x || 0,
              y: action.y || 0,
              scaleX: action.scaleX || 1,
              scaleY: action.scaleY || 1,
              rotation: action.rotation || 0,
              hitStrokeWidth: Math.max(strokeWidth, 20),
              // Neo-Brutalist Hard Shadow
              shadowColor: 'rgba(0,0,0,1)',
              shadowBlur: 0,
              shadowOffsetX: 4,
              shadowOffsetY: 4,
              shadowOpacity: 1,
            };

            if (type === 'freehand' || type === 'pencil') {
              return (
                <Line
                  key={id}
                  {...commonProps}
                  points={data}
                  stroke={color === 'eraser' ? 'rgba(0,0,0,1)' : color}
                  strokeWidth={
                    type === 'pencil' ? strokeWidth * 0.5 : strokeWidth
                  }
                  opacity={
                    (action.opacity ?? 1) * (type === 'pencil' ? 0.7 : 1)
                  }
                  tension={0.5} // Line smoothing
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
              if (data.length < 4) return null;
            }
            const [x1, y1, x2, y2] = data;

            if (type === 'line') {
              return (
                <Line
                  key={id}
                  {...commonProps}
                  points={[x1, y1, x2, y2]}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  lineCap="round"
                  opacity={action.opacity ?? 1}
                />
              );
            }
            if (type === 'arrow') {
              return (
                <Arrow
                  key={id}
                  {...commonProps}
                  points={[x1, y1, x2, y2]}
                  stroke={color}
                  fill={color}
                  strokeWidth={strokeWidth}
                  pointerLength={10 + strokeWidth * 2}
                  pointerWidth={10 + strokeWidth * 2}
                  lineCap="round"
                  lineJoin="round"
                  opacity={action.opacity ?? 1}
                />
              );
            }
            if (type === 'rectangle') {
              return (
                <Rect
                  key={id}
                  {...commonProps}
                  x={(action.x || 0) + Math.min(x1, x2)}
                  y={(action.y || 0) + Math.min(y1, y2)}
                  width={Math.abs(x2 - x1)}
                  height={Math.abs(y2 - y1)}
                  stroke="#1a1a1a"
                  fill={fill ? color : '#ffffff'}
                  strokeWidth={strokeWidth}
                  lineJoin="round"
                  opacity={action.opacity ?? 1}
                  draggable={currentTool === 'select'}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            }
            if (type === 'circle') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <Circle
                  key={id}
                  {...commonProps}
                  x={(action.x || 0) + x1 + (x2 - x1) / 2}
                  y={(action.y || 0) + y1 + (y2 - y1) / 2}
                  radius={radius}
                  stroke="#1a1a1a"
                  fill={fill ? color : '#ffffff'}
                  strokeWidth={strokeWidth}
                  opacity={action.opacity ?? 1}
                  draggable={currentTool === 'select'}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            }
            if (type === 'triangle') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <RegularPolygon
                  key={id}
                  {...commonProps}
                  sides={3}
                  radius={radius}
                  x={(action.x || 0) + x1 + (x2 - x1) / 2}
                  y={(action.y || 0) + y1 + (y2 - y1) / 2}
                  stroke="#1a1a1a"
                  fill={fill ? color : '#ffffff'}
                  strokeWidth={strokeWidth}
                  opacity={action.opacity ?? 1}
                  rotation={
                    (action.rotation || 0) +
                    (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI +
                    90
                  }
                  draggable={currentTool === 'select'}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            }
            if (type === 'star') {
              const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2;
              return (
                <Star
                  key={id}
                  {...commonProps}
                  numPoints={5}
                  innerRadius={radius / 2}
                  outerRadius={radius}
                  x={(action.x || 0) + x1 + (x2 - x1) / 2}
                  y={(action.y || 0) + y1 + (y2 - y1) / 2}
                  stroke="#1a1a1a"
                  fill={color}
                  strokeWidth={strokeWidth}
                  opacity={action.opacity ?? 1}
                  rotation={
                    (action.rotation || 0) +
                    (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI +
                    90
                  }
                  draggable={currentTool === 'select'}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            }
            if (type === 'laser') {
              return (
                <Line
                  key={id}
                  {...commonProps}
                  points={data}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.8}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  shadowOpacity={1}
                  shadowBlur={20}
                  shadowColor={color}
                  shadowOffsetX={0}
                  shadowOffsetY={0}
                />
              );
            }
            if (type === 'text' || type === 'bubble' || type === 'sticker') {
              const padding = type === 'sticker' ? 0 : 12;
              const fontSize = type === 'sticker' ? 64 : strokeWidth * 4;
              return (
                <Group
                  key={id}
                  {...commonProps}
                  x={(action.x || 0) + data[0]}
                  y={(action.y || 0) + data[1]}
                  shadowOpacity={
                    (action.opacity ?? 1) * (type === 'sticker' ? 0.3 : 1)
                  }
                  opacity={action.opacity ?? 1}
                  draggable={currentTool === 'select'}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                >
                  {type === 'bubble' && (
                    <>
                      <Rect
                        width={200} // Fixed width for simplicity in RTM
                        height={fontSize + padding * 2}
                        fill={fill ? color : '#ffffff'}
                        stroke="#1a1a1a"
                        strokeWidth={4}
                        cornerRadius={4}
                      />
                      <Line
                        points={[
                          20,
                          fontSize + padding * 2,
                          40,
                          fontSize + padding * 2 + 15,
                          60,
                          fontSize + padding * 2,
                        ]}
                        closed
                        fill={fill ? color : '#ffffff'}
                        stroke="#1a1a1a"
                        strokeWidth={4}
                      />
                    </>
                  )}
                  <Text
                    text={action.text || ''}
                    fill={
                      type === 'sticker'
                        ? undefined
                        : type === 'bubble' && fill
                          ? color === '#ffffff'
                            ? '#000000'
                            : '#ffffff'
                          : color
                    }
                    fontSize={fontSize}
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    width={type === 'text' ? undefined : 200}
                    padding={padding}
                    offsetX={type === 'sticker' ? 100 : 0}
                    offsetY={type === 'sticker' ? 32 : 0}
                  />
                </Group>
              );
            }
            return null;
          })}

          {isSketchMode && currentTool === 'select' && selectedId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
          {guides.map((guide) => (
            <Line
              key={guide.id}
              points={[guide.x1, guide.y1, guide.x2, guide.y2]}
              stroke="#a855f7" // Purple guide color
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}

          {/* User Cursors */}
          {Object.entries(cursors)
            .filter(([_, cursor]) => Date.now() - cursor.lastUpdate < 3000)
            .map(([id, cursor]) => (
              <Group key={id} x={cursor.x} y={cursor.y}>
                <Circle
                  radius={4}
                  fill={cursor.color}
                  stroke="#1a1a1a"
                  strokeWidth={1}
                />
                <Label x={8} y={8}>
                  <Tag
                    fill={cursor.color}
                    stroke="#1a1a1a"
                    strokeWidth={2}
                    pointerDirection="left"
                    pointerWidth={6}
                    pointerHeight={6}
                    lineJoin="round"
                  />
                  <Text
                    text={cursor.userName}
                    padding={5}
                    fill="#ffffff"
                    fontSize={10}
                    fontStyle="bold"
                  />
                </Label>
              </Group>
            ))}

          {/* Particle Reactions */}
          {activeReactions.map((reaction) => (
            <Group key={reaction.id} x={reaction.x} y={reaction.y}>
              {reaction.particles.map((p) => (
                <Star
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  numPoints={5}
                  innerRadius={2 * p.scale}
                  outerRadius={5 * p.scale}
                  fill={reaction.color}
                  opacity={p.opacity}
                  rotation={p.x * 2}
                />
              ))}
            </Group>
          ))}
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
              placeholder={t('sketch.textPlaceholder')}
              className="bg-background/95 backdrop-blur-sm placeholder:text-muted-foreground outline-none px-3 py-1.5 min-w-[140px] max-w-[260px] rounded-none border-[3px] border-border font-black font-headline uppercase tracking-widest text-foreground"
              style={{
                borderColor: color,
                color: color,
                fontSize: `${Math.max(14, strokeWidth * 4)}px`,
              }}
            />
            <div className="flex gap-1.5 px-0.5">
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border-[2px] border-border">
                {t('sketch.placeHint')}
              </span>
              <span className="bg-background text-foreground px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border-[2px] border-border">
                {t('sketch.cancelHint')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
