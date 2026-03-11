import type Konva from 'konva';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emitSketchClear,
  emitSketchDraw,
  emitSketchRequestSync,
  emitSketchSyncState,
  emitSketchUndo,
  onSketchClear,
  onSketchDraw,
  onSketchProvideSync,
  onSketchSyncState,
  onSketchUndo,
} from '../../room/services/watch-party.api';
import type { SketchAction } from '../../room/types';
import { useSketch } from '../context/SketchContext';

interface PendingTextInput {
  id: string;
  x: number;
  y: number;
  data: number[];
  videoTimestamp: number;
}

export function useSketchOverlay() {
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
  const [pendingText, setPendingText] = useState<PendingTextInput | null>(null);
  const isDrawing = useRef(false);
  const currentActionRef = useRef<SketchAction | null>(null);

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
    window.addEventListener('resize', updateSize, { passive: true });
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
    const cleanupDraw = onSketchDraw((action: SketchAction) => {
      setActions((prev) => [...prev.filter((a) => a.id !== action.id), action]);
    });

    const cleanupClear = onSketchClear(
      ({ userId, type }: { userId: string; type: 'all' | 'self' }) => {
        if (type === 'all') {
          setActions([]);
        } else if (type === 'self' && userId) {
          setActions((prev) => prev.filter((a) => a.userId !== userId));
        }
      },
    );

    const cleanupUndo = onSketchUndo(
      ({ userId, actionId }: { userId: string; actionId: string }) => {
        if (actionId) {
          // Remove specific action by ID
          setActions((prev) => prev.filter((a) => a.id !== actionId));
        } else if (userId) {
          // Fallback: remove last action from that user
          setActions((prev) => {
            const idx = prev.findLastIndex((a) => a.userId === userId);
            if (idx === -1) return prev;
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          });
        }
      },
    );

    const cleanupProvideSync = onSketchProvideSync(
      (data: { requesterId: string }) => {
        if (isHost) {
          emitSketchSyncState(data.requesterId, actions);
        }
      },
    );

    const cleanupSyncState = onSketchSyncState(
      (data: { elements: SketchAction[] }) => {
        setActions(data.elements);
      },
    );

    return () => {
      cleanupDraw();
      cleanupClear();
      cleanupUndo();
      cleanupProvideSync();
      cleanupSyncState();
    };
  }, [isHost, actions]);

  // Handle local clear triggers
  useEffect(() => {
    if (clearTrigger > 0 && canDraw) {
      setActions([]);
      emitSketchClear({ type: 'all' });
    }
  }, [clearTrigger, canDraw]);

  useEffect(() => {
    if (clearSelfTrigger > 0 && canDraw) {
      setActions((prev) => prev.filter((a) => !!a.userId));
      emitSketchClear({ type: 'self' });
    }
  }, [clearSelfTrigger, canDraw]);

  // Handle local undo trigger — only undo the current user's last action.
  // Local actions have no userId (server injects userId on broadcast to others).
  useEffect(() => {
    if (undoTrigger > 0 && canDraw) {
      setActions((prev) => {
        // Find the last action drawn locally (no userId = own action)
        const idx = prev.findLastIndex((a) => !a.userId);
        if (idx === -1) return prev;

        const undoneAction = prev[idx];
        // Broadcast the undo so other users remove this action too
        emitSketchUndo({ actionId: undoneAction.id });

        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
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
        color: currentTool === 'eraser' ? 'eraser' : color,
        strokeWidth,
        videoTimestamp: videoTime,
        data: [pos.x, pos.y],
      };

      if (currentTool === 'text') {
        setPendingText({
          id,
          x: pos.x,
          y: pos.y,
          data: [pos.x, pos.y],
          videoTimestamp: videoTime,
        });
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

  const confirmText = useCallback(
    (text: string) => {
      if (!pendingText) return;
      const action: SketchAction = {
        id: pendingText.id,
        type: 'text',
        color,
        strokeWidth,
        videoTimestamp: pendingText.videoTimestamp,
        data: pendingText.data,
        text: text.trim(),
      };
      emitSketchDraw(action);
      setActions((prev) => [...prev, action]);
      setPendingText(null);
    },
    [pendingText, color, strokeWidth],
  );

  const cancelText = useCallback(() => setPendingText(null), []);

  return {
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
  };
}
