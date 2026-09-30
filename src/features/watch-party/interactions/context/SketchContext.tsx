import type Konva from 'konva';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SketchAction } from '../../room/types';

/** Available drawing tool identifiers for the sketch overlay. */
export type ToolType =
  | 'select'
  | 'freehand'
  | 'pencil'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'text'
  | 'bubble'
  | 'sticker'
  | 'laser'
  | 'eraser'
  | 'reaction';

/** Shape of the sketch context value shared across sketch components. */
export interface SketchContextType {
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  clearTrigger: number;
  triggerClear: () => void;
  clearSelfTrigger: number;
  triggerClearSelf: () => void;
  undoTrigger: number;
  triggerUndo: () => void;
  // Permissions & Mode
  isSketchMode: boolean;
  setIsSketchMode: (active: boolean) => void;
  canDraw: boolean;
  setCanDraw: (can: boolean) => void;
  isHost: boolean;
  setIsHost: (host: boolean) => void;
  isFilled: boolean;
  setIsFilled: (filled: boolean) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  actions: SketchAction[];
  setActions: (
    actions: SketchAction[] | ((prev: SketchAction[]) => SketchAction[]),
  ) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  cursors: Record<
    string,
    {
      x: number;
      y: number;
      userName: string;
      color: string;
      lastUpdate: number;
    }
  >;
  setCursors: (
    cursors:
      | Record<
          string,
          {
            x: number;
            y: number;
            userName: string;
            color: string;
            lastUpdate: number;
          }
        >
      | ((
          prev: Record<
            string,
            {
              x: number;
              y: number;
              userName: string;
              color: string;
              lastUpdate: number;
            }
          >,
        ) => Record<
          string,
          {
            x: number;
            y: number;
            userName: string;
            color: string;
            lastUpdate: number;
          }
        >),
  ) => void;
  selectedSticker: string | null;
  setSelectedSticker: (sticker: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
}

const SketchContext = createContext<SketchContextType | null>(null);

/**
 * Provider that holds all shared sketch state (tool, colour, actions, cursors, etc.)
 * and exposes it via {@link useSketch}.
 */
export function SketchProvider({ children }: { children: ReactNode }) {
  const [currentTool, setCurrentTool] = useState<ToolType>('freehand');
  const [color, setColor] = useState<string>('#ef4444'); // Default red
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [clearSelfTrigger, setClearSelfTrigger] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);

  const [isSketchMode, setIsSketchMode] = useState(false);
  const [canDraw, setCanDraw] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const MAX_SKETCH_ACTIONS = 200;
  const [actions, _setActions] = useState<SketchAction[]>([]);
  const setActions = useCallback(
    (update: SketchAction[] | ((prev: SketchAction[]) => SketchAction[])) => {
      _setActions((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        /*
          `actions` is an array or this provider is broken, so the invariant is enforced here
          rather than trusted from every caller.

          This is not defensive padding. The cap below reads `next.length`, which threw on
          `undefined` and `null` — but silently accepted a string (numeric `length`), a number and
          a plain object (`undefined > 200` is false), storing each as the sketch state. Every
          later consumer calls `prev.findIndex` / `prev.filter`, so a poisoned state broke the
          canvas at whatever touched it next, far from the message that caused it. The payload that
          could do it arrives over RTM and is now also checked at the boundary in
          `rtm-events.ts`; this keeps the invariant true regardless of who calls in.

          Keeping `prev` rather than resetting to `[]` matters: an empty canvas is a legitimate
          state, so coercing would quietly erase the user's work instead of ignoring a bad update.
        */
        if (!Array.isArray(next)) return prev;
        return next.length > MAX_SKETCH_ACTIONS
          ? next.slice(next.length - MAX_SKETCH_ACTIONS)
          : next;
      });
    },
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<
    Record<
      string,
      {
        x: number;
        y: number;
        userName: string;
        color: string;
        lastUpdate: number;
      }
    >
  >({});
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const triggerClear = useCallback(
    () => setClearTrigger((prev) => prev + 1),
    [],
  );

  const triggerClearSelf = useCallback(
    () => setClearSelfTrigger((prev) => prev + 1),
    [],
  );

  const triggerUndo = useCallback(() => setUndoTrigger((prev) => prev + 1), []);

  const value = useMemo(
    () => ({
      currentTool,
      setCurrentTool,
      color,
      setColor,
      strokeWidth,
      setStrokeWidth,
      clearTrigger,
      triggerClear,
      clearSelfTrigger,
      triggerClearSelf,
      undoTrigger,
      triggerUndo,
      isSketchMode,
      setIsSketchMode,
      canDraw,
      setCanDraw,
      isHost,
      setIsHost,
      isFilled,
      setIsFilled,
      opacity,
      setOpacity,
      actions,
      setActions,
      selectedId,
      setSelectedId,
      cursors,
      setCursors,
      selectedSticker,
      setSelectedSticker,
      videoRef,
      stageRef,
    }),
    [
      currentTool,
      color,
      strokeWidth,
      clearTrigger,
      triggerClear,
      clearSelfTrigger,
      triggerClearSelf,
      undoTrigger,
      triggerUndo,
      isSketchMode,
      canDraw,
      isHost,
      isFilled,
      opacity,
      actions,
      selectedId,
      cursors,
      selectedSticker,
      setActions,
    ],
  );

  return <SketchContext value={value}>{children}</SketchContext>;
}

/**
 * Consumes the {@link SketchContext}.
 *
 * @throws If called outside a {@link SketchProvider}.
 * @returns The current sketch context value.
 */
export function useSketch() {
  const context = use(SketchContext);
  if (!context) {
    throw new Error('useSketch must be used within a SketchProvider');
  }
  return context;
}
