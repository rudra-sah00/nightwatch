import type Konva from 'konva';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  onSketchClear,
  onSketchCursorMove,
  onSketchDraw,
  onSketchMoveZ,
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

interface UseSketchOverlayOptions {
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

export function useSketchOverlay({
  rtmSendMessage,
  rtmSendMessageToPeer,
  userId,
  userName,
}: UseSketchOverlayOptions = {}) {
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
    isFilled,
    opacity,
    selectedId,
    setSelectedId,
    selectedSticker,
    setSelectedSticker,
    actions,
    setActions,
    setCursors,
  } = useSketch();

  const t = useTranslations('party');
  const lastCursorBroadcast = useRef(0);
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
    if (!isHost && userId) {
      rtmSendMessage?.({
        type: 'SKETCH_REQUEST_SYNC',
        requesterId: userId,
      });
    }
  }, [isHost, userId, rtmSendMessage]);

  // Listen for RTM events via the bridged on* API
  useEffect(() => {
    const cleanupDraw = onSketchDraw((action: SketchAction) => {
      setActions((prev) => [...prev.filter((a) => a.id !== action.id), action]);
    });

    const cleanupClear = onSketchClear(({ userId: clearUserId, type }) => {
      if (type === 'all') {
        setActions([]);
        setSelectedId(null);
      } else if (type === 'self' && clearUserId) {
        setActions((prev) => prev.filter((a) => a.userId !== clearUserId));
        setSelectedId(null);
      }
    });

    const cleanupUndo = onSketchUndo(({ actionId }) => {
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      if (selectedId === actionId) setSelectedId(null);
    });

    const cleanupProvideSync = onSketchProvideSync(({ requesterId }) => {
      if (isHost && requesterId) {
        rtmSendMessageToPeer?.(requesterId, {
          type: 'SKETCH_SYNC_STATE',
          elements: actions,
          targetId: requesterId,
        });
      }
    });

    const cleanupSyncState = onSketchSyncState<SketchAction[]>(
      ({ elements }) => {
        setActions(elements);
      },
    );

    const cleanupMoveZ = onSketchMoveZ(({ actionId, direction }) => {
      setActions((prev) => {
        const index = prev.findIndex((a) => a.id === actionId);
        if (index === -1) return prev;
        const newActions = [...prev];
        const [action] = newActions.splice(index, 1);
        if (direction === 'front') {
          newActions.push(action);
        } else {
          newActions.unshift(action);
        }
        return newActions;
      });
    });

    const cleanupCursorMove = onSketchCursorMove((data) => {
      if (data.userId === userId) return;
      setCursors((prev) => ({
        ...prev,
        [data.userId]: {
          x: data.x,
          y: data.y,
          userName: data.userName,
          color: data.color,
          lastUpdate: Date.now(),
        },
      }));
    });

    return () => {
      cleanupDraw();
      cleanupClear();
      cleanupUndo();
      cleanupProvideSync();
      cleanupSyncState();
      cleanupMoveZ();
      cleanupCursorMove();
    };
  }, [
    isHost,
    actions,
    rtmSendMessageToPeer,
    selectedId,
    setSelectedId,
    userId,
    setCursors,
    setActions,
  ]);

  // Handle local clear triggers
  useEffect(() => {
    if (clearTrigger > 0 && canDraw && userId) {
      setActions([]);
      setSelectedId(null);
      rtmSendMessage?.({
        type: 'SKETCH_CLEAR',
        mode: 'all',
        userId: userId,
      });
    }
  }, [
    clearTrigger,
    canDraw,
    userId,
    rtmSendMessage,
    setSelectedId,
    setActions,
  ]);

  useEffect(() => {
    if (clearSelfTrigger > 0 && canDraw && userId) {
      setActions((prev) => prev.filter((a) => !!a.userId));
      setSelectedId(null);
      rtmSendMessage?.({
        type: 'SKETCH_CLEAR',
        mode: 'self',
        userId: userId,
      });
    }
  }, [
    clearSelfTrigger,
    canDraw,
    userId,
    rtmSendMessage,
    setSelectedId,
    setActions,
  ]);

  // Handle local undo trigger
  useEffect(() => {
    if (undoTrigger > 0 && canDraw && userId) {
      setActions((prev) => {
        const idx = prev.findLastIndex((a) => !a.userId || a.userId === userId);
        if (idx === -1) return prev;

        const undoneAction = prev[idx];
        rtmSendMessage?.({
          type: 'SKETCH_UNDO',
          actionId: undoneAction.id,
          userId: userId,
        });

        if (selectedId === undoneAction.id) setSelectedId(null);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    }
  }, [
    undoTrigger,
    canDraw,
    userId,
    rtmSendMessage,
    selectedId,
    setSelectedId,
    setActions,
  ]);

  // Automatically clear laser pointer actions after 2 seconds
  useEffect(() => {
    const laserActions = (actions || []).filter((a) => a.type === 'laser');
    if (laserActions.length === 0) return;

    const timer = setTimeout(() => {
      setActions((prev) => (prev || []).filter((a) => a.type !== 'laser'));
    }, 2000);

    return () => clearTimeout(timer);
  }, [actions, setActions]);

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

      // Selection handling
      if (currentTool === 'select') {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          setSelectedId(null);
        }
        return;
      }

      isDrawing.current = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      if (currentTool === 'reaction') {
        rtmSendMessage?.({
          type: 'SKETCH_REACTION',
          kind: 'sparkle',
          x: pos.x,
          y: pos.y,
          color,
          userId: userId || '',
        });
        isDrawing.current = false;
        return;
      }

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
        fill: isFilled,
        videoTimestamp: videoTime,
        data: [pos.x, pos.y],
      };

      if (currentTool === 'sticker' && selectedSticker) {
        const action: SketchAction = {
          id,
          type: 'sticker',
          color,
          strokeWidth,
          fill: true,
          opacity,
          videoTimestamp: videoTime,
          data: [pos.x, pos.y],
          text: selectedSticker,
          userId,
        };
        setActions((prev) => [...prev, action]);
        rtmSendMessage?.({
          type: 'SKETCH_DRAW',
          action,
        });
        isDrawing.current = false;
        setSelectedSticker(null); // Clear after placing
        return;
      }

      if (currentTool === 'text' || currentTool === 'bubble') {
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
    [
      canDraw,
      isSketchMode,
      videoRef,
      currentTool,
      color,
      strokeWidth,
      isFilled,
      uuidv4,
      setSelectedId,
      selectedSticker,
      setSelectedSticker,
      rtmSendMessage,
      userId,
      opacity,
      setActions,
    ],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const point = stage?.getPointerPosition();
      if (!point || !isSketchMode) return;

      // Broadcast cursor position (Throttled to ~30fps / 33ms)
      const now = Date.now();
      if (now - lastCursorBroadcast.current > 33) {
        rtmSendMessage?.({
          type: 'SKETCH_CURSOR_MOVE',
          x: point.x,
          y: point.y,
          userName: userName || t('sketch.anonymous'),
          color,
          userId: userId || '',
        });
        lastCursorBroadcast.current = now;
      }

      if (!isDrawing.current || !canDraw) return;
      if (currentTool === 'select') return;

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
    [
      canDraw,
      isSketchMode,
      currentTool,
      userId,
      userName,
      color,
      rtmSendMessage,
      setActions,
      t,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !canDraw || !isSketchMode) return;
    isDrawing.current = false;

    const action = currentActionRef.current;
    if (action && userId) {
      rtmSendMessage?.({
        type: 'SKETCH_DRAW',
        action: { ...action, userId, userName },
      });
    }

    currentActionRef.current = null;
  }, [canDraw, isSketchMode, userId, rtmSendMessage, userName]);

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      if (!userId) return;
      const node = e.target;
      const id = node.id();
      const action = actions.find((a) => a.id === id);
      if (!action) return;

      const updatedAction: SketchAction = {
        ...action,
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
        userId,
      };

      setActions((prev) => prev.map((a) => (a.id === id ? updatedAction : a)));

      rtmSendMessage?.({
        type: 'SKETCH_DRAW',
        action: updatedAction,
      });
    },
    [actions, userId, rtmSendMessage, setActions],
  );

  const confirmText = useCallback(
    (text: string) => {
      if (!pendingText || !userId) return;
      const action: SketchAction = {
        id: pendingText.id,
        type: currentTool === 'bubble' ? 'bubble' : 'text',
        color,
        strokeWidth,
        fill: isFilled,
        opacity,
        videoTimestamp: pendingText.videoTimestamp,
        data: pendingText.data,
        text: text.trim(),
        userId,
      };
      rtmSendMessage?.({
        type: 'SKETCH_DRAW',
        action,
      });
      setActions((prev) => [...prev, action]);
      setPendingText(null);
    },
    [
      pendingText,
      color,
      strokeWidth,
      userId,
      rtmSendMessage,
      isFilled,
      currentTool,
      opacity,
      setActions,
    ],
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
    handleTransformEnd,
    pendingText,
    confirmText,
    cancelText,
    setSelectedId,
    selectedId,
    handleMoveZ: (id: string, direction: 'front' | 'back') => {
      if (!userId) return;
      setActions((prev) => {
        const index = prev.findIndex((a) => a.id === id);
        if (index === -1) return prev;
        const newActions = [...prev];
        const [action] = newActions.splice(index, 1);
        if (direction === 'front') {
          newActions.push(action);
        } else {
          newActions.unshift(action);
        }
        return newActions;
      });
      rtmSendMessage?.({
        type: 'SKETCH_MOVE_Z',
        actionId: id,
        direction,
      });
    },
  };
}
