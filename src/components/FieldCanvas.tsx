import { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type {
  Batsman,
  FieldConfig,
  Fielder,
  InterceptionResult,
  SimulationPath,
  SimulationSample,
} from '@types';
import '@styles/field.css';

const VIEW_MARGIN = 10;
const PITCH_WIDTH = 3;
const EDGE_BUFFER = 1.5;

const toPoint = (x: number, y: number): string => `${x.toFixed(2)},${(-y).toFixed(2)}`;

const toCircle = (x: number, y: number): { cx: number; cy: number } => ({
  cx: Number(x.toFixed(2)),
  cy: Number((-y).toFixed(2)),
});

const FieldCanvasComponent = ({
  field,
  path,
  fielders,
  batsmen,
  boundarySample,
  interception,
  onFielderPositionChange,
}: {
  field: FieldConfig;
  path: SimulationPath;
  fielders: Fielder[];
  batsmen: Batsman[];
  boundarySample?: SimulationSample;
  interception?: InterceptionResult;
  onFielderPositionChange?: (id: string, position: { x: number; y: number }) => void;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<{ id: string; pointerId: number } | null>(null);

  const radius = (field.boundaryRadius as number) + VIEW_MARGIN;
  const viewBox = `${-radius} ${-radius} ${radius * 2} ${radius * 2}`;
  const pitchHalfLength = (field.pitchLength as number) / 2;
  const boundaryRadius = field.boundaryRadius as number;

  const { flightPoints, rollPoints, bounceSample } = useMemo(() => {
    const flightSegments: string[] = [];
    const rollSegments: string[] = [];
    let bounce: SimulationSample | undefined;

    path.forEach((sample) => {
      const point = toPoint(sample.position.x as number, sample.position.y as number);
      if (sample.phase === 'roll') {
        rollSegments.push(point);
      } else {
        flightSegments.push(point);
      }
      if (!bounce && sample.event === 'bounce') {
        bounce = sample;
      }
    });

    return {
      flightPoints: flightSegments.join(' '),
      rollPoints: rollSegments.join(' '),
      bounceSample: bounce,
    };
  }, [path]);

  const interceptPosition = interception?.interceptPosition
    ? toCircle(interception.interceptPosition.x as number, interception.interceptPosition.y as number)
    : undefined;

  const boundaryPosition = boundarySample
    ? toCircle(boundarySample.position.x as number, boundarySample.position.y as number)
    : undefined;

  const bouncePosition = bounceSample
    ? toCircle(bounceSample.position.x as number, bounceSample.position.y as number)
    : undefined;

  const clampToField = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      const maxRadius = Math.max(boundaryRadius - EDGE_BUFFER, 1);
      const distance = Math.hypot(x, y);
      if (distance <= maxRadius) {
        return { x, y };
      }
      const scale = maxRadius / distance;
      return { x: x * scale, y: y * scale };
    },
    [boundaryRadius],
  );

  const toFieldCoordinates = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) {
        return null;
      }
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }
      const view = svg.viewBox.baseVal;
      const xRatio = (clientX - rect.left) / rect.width;
      const yRatio = (clientY - rect.top) / rect.height;
      const svgX = view.x + xRatio * view.width;
      const svgY = view.y + yRatio * view.height;
      const fieldX = svgX;
      const fieldY = -svgY;
      return clampToField(fieldX, fieldY);
    },
    [clampToField],
  );

  const updateDragPosition = useCallback(
    (id: string, clientX: number, clientY: number) => {
      if (!onFielderPositionChange) {
        return;
      }
      const fieldPoint = toFieldCoordinates(clientX, clientY);
      if (!fieldPoint) {
        return;
      }
      onFielderPositionChange(id, fieldPoint);
    },
    [onFielderPositionChange, toFieldCoordinates],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!dragging || event.pointerId !== dragging.pointerId) {
        return;
      }
      event.preventDefault();
      updateDragPosition(dragging.id, event.clientX, event.clientY);
    },
    [dragging, updateDragPosition],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (dragging && event.pointerId === dragging.pointerId) {
        const svg = svgRef.current;
        if (svg && svg.hasPointerCapture(event.pointerId)) {
          svg.releasePointerCapture(event.pointerId);
        }
        setDragging(null);
      }
    },
    [dragging],
  );

  return (
    <svg
      className="field-canvas"
      viewBox={viewBox}
      role="img"
      aria-label="Top-down view of the cricket field showing the simulated ball path and player positions"
      ref={svgRef}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <defs>
        <radialGradient id="field-gradient" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#0f9d58" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0b6b3a" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="path-flight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="path-roll" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      <circle
        className="field-boundary"
        cx={0}
        cy={0}
        r={boundaryRadius}
        fill="url(#field-gradient)"
        stroke="#1e3a8a"
      />

      <circle
        className="inner-circle"
        cx={0}
        cy={0}
        r={field.innerCircleRadius as number}
        fill="none"
        stroke="#1e40af"
        strokeDasharray="6 6"
      />

      <rect
        className="pitch"
        x={(-PITCH_WIDTH / 2).toFixed(2)}
        y={-(pitchHalfLength + 2).toFixed(2)}
        width={PITCH_WIDTH}
        height={(field.pitchLength as number + 4).toFixed(2)}
        rx={0.5}
        fill="#f9fafb"
        opacity={0.85}
      />

      <g className="compass">
        <text x={0} y={-(boundaryRadius - 5)} textAnchor="middle" aria-hidden="true">
          N
        </text>
        <text x={boundaryRadius - 5} y={4} aria-hidden="true">
          E
        </text>
        <text x={0} y={boundaryRadius - 5} textAnchor="middle" aria-hidden="true">
          S
        </text>
        <text x={-(boundaryRadius - 5)} y={4} textAnchor="end" aria-hidden="true">
          W
        </text>
      </g>

      {flightPoints && (
        <polyline className="path flight" points={flightPoints} stroke="url(#path-flight)" />
      )}

      {rollPoints && (
        <polyline className="path roll" points={rollPoints} stroke="url(#path-roll)" />
      )}

      {bouncePosition && (
        <circle
          className="path-event bounce"
          cx={bouncePosition.cx}
          cy={bouncePosition.cy}
          r={1.2}
          aria-label="Ball bounce point"
        />
      )}

      {interceptPosition && (
        <g className="path-event intercept" aria-label="Fielder interception point">
          <circle cx={interceptPosition.cx} cy={interceptPosition.cy} r={2} />
          <circle cx={interceptPosition.cx} cy={interceptPosition.cy} r={3.2} />
        </g>
      )}

      {boundaryPosition && (
        <g className="path-event boundary" aria-label="Boundary point">
          <circle cx={boundaryPosition.cx} cy={boundaryPosition.cy} r={2.4} />
        </g>
      )}

      {batsmen.map((batsman) => {
        const { cx, cy } = toCircle(
          batsman.creasePosition.x as number,
          batsman.creasePosition.y as number,
        );
        return (
          <g key={batsman.id} className="player batsman" aria-label={`${batsman.name} at the crease`}>
            <circle cx={cx} cy={cy} r={2.4} />
            <text x={cx} y={cy + 4} textAnchor="middle">
              {batsman.id === 'striker' ? 'S' : 'NS'}
            </text>
          </g>
        );
      })}

      {fielders.map((fielder) => {
        const { cx, cy } = toCircle(fielder.position.x as number, fielder.position.y as number);
        const isDragging = dragging?.id === fielder.id;
        return (
          <g
            key={fielder.id}
            className={`player fielder${onFielderPositionChange ? ' is-draggable' : ''}${
              isDragging ? ' is-dragging' : ''
            }`}
            aria-label={`${fielder.name} fielder`}
            onPointerDown={(event) => {
              if (!onFielderPositionChange) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              const svg = svgRef.current;
              if (svg) {
                svg.setPointerCapture(event.pointerId);
              }
              setDragging({ id: fielder.id, pointerId: event.pointerId });
              updateDragPosition(fielder.id, event.clientX, event.clientY);
            }}
          >
            <circle cx={cx} cy={cy} r={2.2} />
            {fielder.number !== undefined && (
              <text x={cx} y={cy + 3.4} textAnchor="middle">
                {fielder.number}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const FieldCanvas = memo(FieldCanvasComponent);
