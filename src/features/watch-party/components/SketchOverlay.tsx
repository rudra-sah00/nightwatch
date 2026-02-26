import type Konva from 'konva';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useSketch } from '../context/SketchContext';
import {
  emitSketchClear,
  emitSketchDraw,
  emitSketchRequestSync,
  emitSketchSyncState,
  onSketchClear,
  onSketchDraw,
  onSketchProvideSync,
  onSketchSyncState,
} from '../services/watch-party.api';
import type { SketchAction } from '../types';

export function SketchOverlay() {
  const {
    currentTool,
    color,
    strokeWidth,
    clearTrigger,
    clearSelfTrigger,
    undoTrigger,
    isSketchMode,
    canDraw,
    videoRef,
    isHost,
  } = useSketch();

  const [actions, setActions] = useState<SketchAction[]>([]);
  const isDrawing = useRef(false);
  const currentActionRef = useRef<SketchAction | null>(null);

  // Track container dimensions to keep canvas responsive
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Sync with host on mount
  useEffect(() => {
    if (!isHost) {
      emitSketchRequestSync();
    }
  }, [isHost]);

  // Handle Socket Events
  useEffect(() => {
    const cleanupDraw = onSketchDraw((action) => {
      setActions((prev) => [...prev.filter((a) => a.id !== action.id), action]);
    });

    const cleanupClear = onSketchClear(({ userId, type }) => {
      if (type === 'all') {
        setActions([]);
      } else if (type === 'self' && userId) {
        setActions((prev) => prev.filter((a) => a.userId !== userId));
      }
    });

    const cleanupProvideSync = onSketchProvideSync((data) => {
      if (isHost) {
        emitSketchSyncState(data.requesterId, actions);
      }
    });

    const cleanupSyncState = onSketchSyncState((data) => {
      setActions(data.elements);
    });

    return () => {
      cleanupDraw();
      cleanupClear();
      cleanupProvideSync();
      cleanupSyncState();
    };
  }, [isHost, actions]);

  // Handle local clear triggers from sidebar
  useEffect(() => {
    if (clearTrigger > 0 && canDraw) {
      setActions([]);
      emitSketchClear({ type: 'all' });
    }
  }, [clearTrigger, canDraw]);

  useEffect(() => {
    if (clearSelfTrigger > 0 && canDraw) {
      // In a real app we'd need our own userId to filter accurately locally,
      // but since we are the ones drawing, we can just clear our local "unsynced" ones
      // or wait for the roundtrip. For simplicity, we filter locally and emit.
      // The server will broadcast this to others.
      setActions((prev) => prev.filter((a) => !!a.userId)); // userId is only present on broadcasted actions
      emitSketchClear({ type: 'self' });
    }
  }, [clearSelfTrigger, canDraw]);

  // Handle local undo trigger from sidebar
  useEffect(() => {
    if (undoTrigger > 0 && canDraw) {
      setActions((prev) => prev.slice(0, -1));
      // In a real app, we'd emit an undo event or sync the whole state
      // For now this is a local/host-driven undo for the current session representation
    }
  }, [undoTrigger, canDraw]);

  // Automatically clear laser pointer actions after 2 seconds
  useEffect(() => {
    const laserActions = actions.filter((a) => a.type === 'laser');
    if (laserActions.length === 0) return;

    const timer = setTimeout(() => {
      setActions((prev) => prev.filter((a) => a.type !== 'laser'));
    }, 2000);

    return () => clearTimeout(timer);
  }, [actions]);

  // Generate simple UUID
  const uuidv4 = useCallback(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!canDraw || !isSketchMode) return;

      isDrawing.current = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      const id = uuidv4();
      const videoTime = videoRef.current?.currentTime || 0;

      const newAction: SketchAction = {
        id,
        type:
          currentTool === 'eraser'
            ? 'freehand'
            : (currentTool as SketchAction['type']),
        color: currentTool === 'eraser' ? 'eraser' : color, // 'eraser' acts as a flag
        strokeWidth,
        videoTimestamp: videoTime,
        data: [pos.x, pos.y],
      };

      if (currentTool === 'text') {
        const text = prompt('Enter text:');
        if (!text) {
          isDrawing.current = false;
          return;
        }
        newAction.text = text;
        // Text tool is a single click action, so we emit immediately
        emitSketchDraw(newAction);
        setActions((prev) => [...prev, newAction]);
        isDrawing.current = false;
        return;
      }

      currentActionRef.current = newAction;
      setActions((prev) => [...prev, newAction]);
    },
    [canDraw, isSketchMode, videoRef, currentTool, color, strokeWidth, uuidv4],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawing.current || !canDraw || !isSketchMode) return;

      const stage = e.target.getStage();
      const point = stage?.getPointerPosition();
      if (!point) return;

      const lastAction = currentActionRef.current;
      if (!lastAction) return;

      let newData = [...lastAction.data];

      if (
        lastAction.type === 'freehand' ||
        lastAction.type === 'pencil' ||
        lastAction.type === 'laser'
      ) {
        newData = newData.concat([point.x, point.y]);
      } else {
        // For shapes (arrow, rect, circle), data is [startX, startY, endX, endY]
        newData = [newData[0], newData[1], point.x, point.y];
      }

      const updatedAction = { ...lastAction, data: newData };
      currentActionRef.current = updatedAction;

      setActions((prev) => [
        ...prev.slice(0, Math.max(0, prev.length - 1)),
        updatedAction,
      ]);
    },
    [canDraw, isSketchMode],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !canDraw || !isSketchMode) return;
    isDrawing.current = false;

    const action = currentActionRef.current;
    if (action) {
      emitSketchDraw(action);
    }

    currentActionRef.current = null;
  }, [canDraw, isSketchMode]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-40 ${isSketchMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
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
    </div>
  );
}
