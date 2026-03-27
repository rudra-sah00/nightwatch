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
    { x: number; y: number; userName: string; color: string }
  >;
  setCursors: (
    cursors:
      | Record<
          string,
          { x: number; y: number; userName: string; color: string }
        >
      | ((
          prev: Record<
            string,
            { x: number; y: number; userName: string; color: string }
          >,
        ) => Record<
          string,
          { x: number; y: number; userName: string; color: string }
        >),
  ) => void;
  selectedSticker: string | null;
  setSelectedSticker: (sticker: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
}

const SketchContext = createContext<SketchContextType | null>(null);

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
  const [actions, setActions] = useState<SketchAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<
    Record<string, { x: number; y: number; userName: string; color: string }>
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
    ],
  );

  return <SketchContext value={value}>{children}</SketchContext>;
}

export function useSketch() {
  const context = use(SketchContext);
  if (!context) {
    throw new Error('useSketch must be used within a SketchProvider');
  }
  return context;
}
