import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const RUN_SPEED_MIN = 3.2;
const CHASE_DISTANCE_BUFFER = 12;

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
  const [animationTime, setAnimationTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | undefined>(undefined);
  const animationTimeRef = useRef(0);
  const maxTimeRef = useRef(0);
  const playingRef = useRef(false);
  const [fielderPositions, setFielderPositions] = useState(
    () =>
      fielders.map((fielder) => ({
        id: fielder.id,
        x: fielder.position.x as number,
        y: fielder.position.y as number,
      })),
  );
  const initialFielderPositionsRef = useRef(
    fielders.map((fielder) => ({
      id: fielder.id,
      x: fielder.position.x as number,
      y: fielder.position.y as number,
    })),
  );

  const stopAnimation = useCallback(() => {
    playingRef.current = false;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    if (path.length === 0) {
      setAnimationTime(0);
      setIsPlaying(false);
      return;
    }

    animationTimeRef.current = 0;
    maxTimeRef.current = path[path.length - 1].time as number;
    lastTimestampRef.current = undefined;
    playingRef.current = true;
    setAnimationTime(0);
    setIsPlaying(true);

    const step = (timestamp: number) => {
      if (!playingRef.current) {
        return;
      }
      if (lastTimestampRef.current === undefined) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const nextTime = Math.min(animationTimeRef.current + delta, maxTimeRef.current);
      animationTimeRef.current = nextTime;
      setAnimationTime(nextTime);

      if (nextTime >= maxTimeRef.current) {
        playingRef.current = false;
        setIsPlaying(false);
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [path, stopAnimation]);

  useEffect(() => {
    startAnimation();

    return () => {
      stopAnimation();
    };
  }, [path, startAnimation, stopAnimation]);

  const handleReplay = useCallback(() => {
    startAnimation();
  }, [startAnimation]);

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

  const ballState = useMemo<
    { x: number; y: number; height: number; phase: SimulationSample['phase'] } | null
  >(() => {
    if (path.length === 0) {
      return null;
    }
    const lastSample = path[path.length - 1];
    const targetTime = Math.min(animationTime, lastSample.time as number);

    if (targetTime <= (path[0].time as number)) {
      return {
        x: path[0].position.x as number,
        y: path[0].position.y as number,
        height: path[0].position.z as number,
        phase: path[0].phase,
      };
    }

    let nextIndex = path.findIndex((sample) => (sample.time as number) >= targetTime);
    if (nextIndex === -1) {
      return {
        x: lastSample.position.x as number,
        y: lastSample.position.y as number,
        height: lastSample.position.z as number,
        phase: lastSample.phase,
      };
    }
    if (nextIndex === 0) {
      nextIndex = 1;
    }

    const prevSample = path[nextIndex - 1];
    const nextSample = path[nextIndex];
    const prevTime = prevSample.time as number;
    const nextTime = nextSample.time as number;
    const span = nextTime - prevTime || 1;
    const ratio = Math.min(Math.max((targetTime - prevTime) / span, 0), 1);

    const interpolate = (a: number, b: number) => a + (b - a) * ratio;

    return {
      x: interpolate(prevSample.position.x as number, nextSample.position.x as number),
      y: interpolate(prevSample.position.y as number, nextSample.position.y as number),
      height: interpolate(prevSample.position.z as number, nextSample.position.z as number),
      phase: ratio < 0.5 ? prevSample.phase : nextSample.phase,
    };
  }, [path, animationTime]);

  const maxHeight = useMemo(() => {
    if (path.length === 0) {
      return 0;
    }
    return Math.max(...path.map((sample) => sample.position.z as number));
  }, [path]);

  const ballPosition = ballState ? toCircle(ballState.x, ballState.y) : undefined;
  const ballRadius = useMemo(() => {
    if (!ballState) {
      return 0;
    }
    const normalized =
      maxHeight > 0 ? Math.min(Math.max(ballState.height / maxHeight, 0), 1) : 0;
    const MIN_RADIUS = 1;
    const MAX_RADIUS = 2.4;
    return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * normalized;
  }, [ballState, maxHeight]);

  useEffect(() => {
    const basePositions = fielders.map((fielder) => ({
      id: fielder.id,
      x: fielder.position.x as number,
      y: fielder.position.y as number,
    }));
    initialFielderPositionsRef.current = basePositions;
    setFielderPositions(basePositions);
  }, [fielders, path]);

  useEffect(() => {
    if (!ballState) {
      setFielderPositions(initialFielderPositionsRef.current);
      return;
    }

    const ballX = ballState.x;
    const ballY = ballState.y;
    const basePositions = initialFielderPositionsRef.current;

    const distances = basePositions.map((pos) => Math.hypot(ballX - pos.x, ballY - pos.y));
    const minDistance = distances.length > 0 ? Math.min(...distances) : 0;

    const nextPositions = fielders.map((fielder, index) => {
      const basePos = basePositions[index] ?? {
        id: fielder.id,
        x: fielder.position.x as number,
        y: fielder.position.y as number,
      };
      const startX = basePos.x;
      const startY = basePos.y;

      const distanceToBall = distances[index] ?? 0;
      const isIntercepting = interception?.fielderId === fielder.id;
      const shouldChase =
        isIntercepting || distanceToBall <= minDistance + CHASE_DISTANCE_BUFFER;

      if (!shouldChase) {
        return { id: fielder.id, x: startX, y: startY };
      }

      const targetX =
        isIntercepting && interception?.interceptPosition
          ? (interception.interceptPosition.x as number)
          : ballX;
      const targetY =
        isIntercepting && interception?.interceptPosition
          ? (interception.interceptPosition.y as number)
          : ballY;

      const vectorX = targetX - startX;
      const vectorY = targetY - startY;
      const baseDistance = Math.hypot(vectorX, vectorY);

      if (baseDistance <= 0.01) {
        return { id: fielder.id, x: targetX, y: targetY };
      }

      const baseSpeed = Math.max(fielder.maxSpeed as number, RUN_SPEED_MIN);
      const normalized = Math.min(Math.max(baseDistance / Math.max(boundaryRadius, 1), 0), 1);
      const effectiveSpeed = baseSpeed * normalized;
      const travel = effectiveSpeed * Math.max(animationTime, 0);
      const ratio = Math.min(travel / baseDistance, 1);

      return {
        id: fielder.id,
        x: startX + vectorX * ratio,
        y: startY + vectorY * ratio,
      };
    });

    setFielderPositions(nextPositions);
  }, [fielders, ballState, interception, animationTime, boundaryRadius]);
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
    <div className="field-viewport">
      <button
        type="button"
        className="play-toggle"
        onClick={handleReplay}
        disabled={isPlaying}
      >
        {isPlaying ? 'Playing…' : 'Replay'}
      </button>
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

      {ballPosition && (
        <circle
          className={`ball-marker${ballState?.phase === 'flight' ? ' is-flight' : ' is-ground'}`}
          cx={ballPosition.cx}
          cy={ballPosition.cy}
          r={ballRadius}
          aria-label="Animated ball position"
        />
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

      {fielderPositions.map((position) => {
        const fielder = fielders.find((item) => item.id === position.id);
        if (!fielder) {
          return null;
        }
        const displayX =
          dragging?.id === fielder.id ? (fielder.position.x as number) : position.x;
        const displayY =
          dragging?.id === fielder.id ? (fielder.position.y as number) : position.y;
        const { cx, cy } = toCircle(displayX, displayY);
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
    </div>
  );
};

export const FieldCanvas = memo(FieldCanvasComponent);
