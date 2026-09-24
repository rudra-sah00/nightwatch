import type Konva from 'konva';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { RTMMessage } from '../../room/types/rtm-messages';
import { useSketch } from '../context/SketchContext';

interface PendingTextInput {
  id: string;
  x: number;
  y: number;
  data: number[];
  videoTimestamp: number;
}

/** Options for {@link useSketchOverlay}. */
interface UseSketchOverlayOptions {
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

/** Moves a single action to the front or back of the z-order. */
function reorder(
  actions: SketchAction[],
  actionId: string,
  direction: 'front' | 'back',
): SketchAction[] {
  const index = actions.findIndex((a) => a.id === actionId);
  if (index === -1) return actions;
  const next = [...actions];
  const [action] = next.splice(index, 1);
  if (direction === 'front') next.push(action);
  else next.unshift(action);
  return next;
}

/**
 * Z-order control for a single sketch action.
 *
 * Split out of {@link useSketchOverlay} so the sidebar tool panel can reorder
 * shapes without mounting a second copy of the whole overlay hook (which would
 * double-register every RTM listener and trigger effect).
 *
 * @param options - RTM sender and the acting user's id.
 * @returns `handleMoveZ(actionId, direction)`.
 */
export function useSketchMoveZ({
  rtmSendMessage,
  userId,
}: {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
} = {}) {
  const { setActions } = useSketch();

  const handleMoveZ = useCallback(
    (id: string, direction: 'front' | 'back') => {
      if (!userId) return;
      setActions((prev) => reorder(prev, id, direction));
      rtmSendMessage?.({ type: 'SKETCH_MOVE_Z', actionId: id, direction });
    },
    [setActions, rtmSendMessage, userId],
  );

  return { handleMoveZ };
}

/**
 * Core logic hook for the Konva sketch overlay.
 *
 * Handles mouse/touch drawing, shape creation, text input, transform/drag,
 * undo, clear, z-order, cursor broadcasting, and RTM synchronisation of
 * all sketch actions across party members.
 *
 * Must be mounted exactly once per party (inside `SketchOverlay`); it owns the
 * RTM subscriptions and the clear/undo trigger effects.
 *
 * @param options - RTM functions, user identity, and optional overrides.
 * @returns Stage event handlers, pending text state, action list, and helpers.
 */
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

  // Ref to access latest actions inside event callbacks without re-subscribing
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  /**
   * Volatile values the effects below need to *read* but must not depend on.
   *
   * The clear/undo triggers are monotonic counters: once they pass 0 they stay
   * above 0 forever. If the trigger effects also depended on `rtmSendMessage`,
   * `selectedId`, `canDraw`, etc., then any identity change in those would
   * re-run the effect and wipe the canvas / delete another stroke. Reading them
   * through a ref keeps the effects keyed on the trigger alone.
   */
  const latest = useRef({ canDraw, userId, userName, selectedId });
  latest.current = { canDraw, userId, userName, selectedId };
  const sendRef = useRef(rtmSendMessage);
  sendRef.current = rtmSendMessage;

  /**
   * Keep the Konva stage the same size as its container.
   *
   * A `window.resize` listener alone is not enough: collapsing or expanding the
   * party sidebar changes the player's width by ~380px without ever resizing
   * the window, which left the stage at its old size — strokes landed at the
   * wrong coordinates and the uncovered strip of video ignored input entirely.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setStageSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    // Coalesce the burst of callbacks fired during the sidebar width transition.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', schedule, { passive: true });
      return () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener('resize', schedule);
      };
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Prune stale cursors every 5s (removes cursors not updated in 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const entries = Object.entries(prev);
        const stale = entries.filter(([, c]) => now - c.lastUpdate > 5000);
        if (stale.length === 0) return prev;
        const next = { ...prev };
        for (const [id] of stale) delete next[id];
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [setCursors]);

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
      setActions((prev) => {
        const index = prev.findIndex((a) => a.id === action.id);
        if (index === -1) return [...prev, action];
        const next = [...prev];
        next[index] = action;
        return next;
      });
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
      setSelectedId(null);
    });

    const cleanupProvideSync = onSketchProvideSync(({ requesterId }) => {
      if (isHost && requesterId) {
        rtmSendMessageToPeer?.(requesterId, {
          type: 'SKETCH_SYNC_STATE',
          elements: actionsRef.current,
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
      setActions((prev) => reorder(prev, actionId, direction));
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
    rtmSendMessageToPeer,
    setSelectedId,
    userId,
    setCursors,
    setActions,
  ]);

  // Host-only "clear everything". Keyed on the trigger counter alone.
  useEffect(() => {
    if (clearTrigger === 0) return;
    const { canDraw: allowed, userId: uid } = latest.current;
    if (!allowed || !uid) return;

    setActions([]);
    setSelectedId(null);
    sendRef.current?.({ type: 'SKETCH_CLEAR', mode: 'all', userId: uid });
  }, [clearTrigger, setActions, setSelectedId]);

  // "Clear mine" — drop only this user's own actions.
  useEffect(() => {
    if (clearSelfTrigger === 0) return;
    const { canDraw: allowed, userId: uid } = latest.current;
    if (!allowed || !uid) return;

    setActions((prev) => prev.filter((a) => a.userId !== uid));
    setSelectedId(null);
    sendRef.current?.({ type: 'SKETCH_CLEAR', mode: 'self', userId: uid });
  }, [clearSelfTrigger, setActions, setSelectedId]);

  // Undo the user's own most recent action.
  useEffect(() => {
    if (undoTrigger === 0) return;
    const {
      canDraw: allowed,
      userId: uid,
      selectedId: currentSelection,
    } = latest.current;
    if (!allowed || !uid) return;

    const current = actionsRef.current;
    /*
      Only ever undo something this user drew.

      The predicate used to be `!a.userId || a.userId === uid`, which made every
      action with no author undoable by anybody in the room. Actions arriving from
      `SKETCH_SYNC_STATE` are exactly the ones that can lack an author — they come
      from whatever build the sender is running — so on a mixed-version party one
      person could reach into another's strokes.
    */
    const idx = current.findLastIndex((a) => a.userId === uid);
    if (idx === -1) return;

    const undone = current[idx];
    setActions((prev) => prev.filter((a) => a.id !== undone.id));
    if (currentSelection === undone.id) setSelectedId(null);
    sendRef.current?.({
      type: 'SKETCH_UNDO',
      actionId: undone.id,
      userId: uid,
    });
  }, [undoTrigger, setActions, setSelectedId]);

  /*
    ---- laser strokes fade themselves after 2 s ----

    Keyed on WHICH lasers exist, not on the action list, and one timer per laser.

    The previous version depended on `actions`, which changes on every pointer-move
    of every stroke anybody in the party is drawing. The effect re-ran ~60 times a
    second and cleared its own pending timer each time, so a laser never reached
    two seconds while any drawing was in progress and hung on screen until the room
    went completely still. A single shared timer had the same flaw in miniature: a
    laser drawn later extended the life of every earlier one.
  */
  const laserTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  useEffect(() => {
    return () => {
      for (const timer of laserTimers.current.values()) clearTimeout(timer);
      laserTimers.current.clear();
    };
  }, []);

  const laserIds = (actions || [])
    .filter((a) => a.type === 'laser')
    .map((a) => a.id)
    .join(',');

  useEffect(() => {
    const present = new Set(laserIds ? laserIds.split(',') : []);

    // Something else removed it (undo, clear) — drop its timer.
    for (const [id, timer] of laserTimers.current) {
      if (present.has(id)) continue;
      clearTimeout(timer);
      laserTimers.current.delete(id);
    }

    for (const id of present) {
      if (laserTimers.current.has(id)) continue;
      const timer = setTimeout(() => {
        laserTimers.current.delete(id);
        setActions((prev) => (prev || []).filter((a) => a.id !== id));
      }, 2000);
      laserTimers.current.set(id, timer);
    }
  }, [laserIds, setActions]);

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

      // `userId` / `userName` / `opacity` are stamped here, not at mouse-up.
      // Without them the local copy of a stroke was anonymous: it could not be
      // selected or dragged by its own author, "clear mine" could not find it,
      // and the opacity slider had no effect on pen or shape strokes.
      const newAction: SketchAction = {
        id,
        type:
          currentTool === 'eraser'
            ? 'freehand'
            : (currentTool as SketchAction['type']),
        color: currentTool === 'eraser' ? 'eraser' : color,
        strokeWidth,
        fill: isFilled,
        opacity,
        videoTimestamp: videoTime,
        data: [pos.x, pos.y],
        userId,
        userName,
      };

      if (currentTool === 'sticker' && selectedSticker) {
        const action: SketchAction = {
          ...newAction,
          type: 'sticker',
          color,
          fill: true,
          text: selectedSticker,
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
      userName,
      opacity,
      setActions,
    ],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const point = stage?.getPointerPosition();
      if (!point || !isSketchMode) return;

      // Broadcast the live cursor position, throttled to ~10fps.
      const now = Date.now();
      if (now - lastCursorBroadcast.current > 100) {
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

      // Update by id. The previous version overwrote whatever sat in the last
      // slot, which destroyed any remote stroke that arrived mid-drag and
      // duplicated the local one.
      setActions((prev) => {
        const index = prev.findIndex((a) => a.id === updatedAction.id);
        if (index === -1) return [...prev, updatedAction];
        const next = [...prev];
        next[index] = updatedAction;
        return next;
      });
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
      const action = actionsRef.current.find((a) => a.id === id);
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
    [userId, rtmSendMessage, setActions],
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
        userName,
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
      userName,
      rtmSendMessage,
      isFilled,
      currentTool,
      opacity,
      setActions,
    ],
  );

  const cancelText = useCallback(() => setPendingText(null), []);

  const { handleMoveZ } = useSketchMoveZ({ rtmSendMessage, userId });

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
    handleMoveZ,
  };
}
