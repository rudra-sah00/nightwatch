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
import { useSketchOverlay } from '../hooks/use-sketch-overlay';

export function SketchOverlay() {
  const {
    actions,
    containerRef,
    stageSize,
    isSketchMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useSketchOverlay();

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
