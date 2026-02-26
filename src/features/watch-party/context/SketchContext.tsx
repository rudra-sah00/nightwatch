import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToolType =
  | 'freehand'
  | 'pencil'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'text'
  | 'laser'
  | 'eraser';

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
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      videoRef,
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
    ],
  );

  return (
    <SketchContext.Provider value={value}>{children}</SketchContext.Provider>
  );
}

export function useSketch() {
  const context = useContext(SketchContext);
  if (!context) {
    throw new Error('useSketch must be used within a SketchProvider');
  }
  return context;
}
