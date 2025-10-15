import type {
  FieldConfig,
  FrictionLevel,
  Shot,
  SimulationEvent,
  SimulationPath,
  SimulationSample,
  SimulationPhase,
  Vector2DVelocity,
  Vector3D,
  Vector3DVelocity,
} from '@types';
import { FRICTION_COEFFICIENTS, meters, metersPerSecond, seconds } from '@types';

export const GRAVITY = 9.81; // m/s^2
export const BALL_MASS = 0.156; // kg
export const BALL_RADIUS = 0.036; // m
export const BALL_CROSS_SECTION = Math.PI * BALL_RADIUS * BALL_RADIUS;
export const AIR_DENSITY = 1.225; // kg/m^3 at sea level
export const AIR_DRAG_COEFFICIENT = 0.35;
export const DEFAULT_TIME_STEP = 0.02; // seconds
export const MAX_SIMULATION_TIME = 12; // seconds
export const SURFACE_DAMPING = 0.82;
export const SPIN_DECAY = 0.1;
const BOUNCE_VERTICAL_THRESHOLD = 1.2;
const MIN_ROLLING_SPEED = 0.4;

export interface ComputeBallPathOptions {
  timeStep?: number;
  maxTime?: number;
}

export interface BallPathResult {
  samples: SimulationPath;
  boundarySample?: SimulationSample;
  bounceSamples: SimulationSample[];
  rollStartIndex?: number;
  stopSample: SimulationSample;
  isSix: boolean;
}

export interface RollPhaseResult {
  samples: SimulationSample[];
  boundarySample?: SimulationSample;
  stopSample: SimulationSample;
}

export const degToRad = (value: number): number => (value * Math.PI) / 180;
export const radToDeg = (value: number): number => (value * 180) / Math.PI;

const toVector3D = (x: number, y: number, z: number): Vector3D => ({
  x: meters(x),
  y: meters(y),
  z: meters(z),
});

const toVelocity = (x: number, y: number, z: number): Vector3DVelocity => ({
  x: metersPerSecond(x),
  y: metersPerSecond(y),
  z: metersPerSecond(z),
});

const magnitude2D = (vector: Pick<Vector3D, 'x' | 'y'> | Vector2DVelocity): number =>
  Math.hypot(vector.x as number, vector.y as number);

const magnitude3D = (
  vector: Pick<Vector3D, 'x' | 'y' | 'z'> | Vector3DVelocity,
): number =>
  Math.sqrt(
    (vector.x as number) ** 2 + (vector.y as number) ** 2 + (vector.z as number) ** 2,
  );

const distanceFromOrigin = (position: Vector3D): number =>
  Math.hypot(position.x as number, position.y as number);

const createSample = (
  time: number,
  position: Vector3D,
  velocity: Vector3DVelocity,
  phase: SimulationPhase,
  pathDistance: number,
  event?: SimulationEvent,
): SimulationSample => ({
  time: seconds(time),
  position,
  velocity,
  speed: metersPerSecond(magnitude3D(velocity)),
  distanceFromOrigin: meters(distanceFromOrigin(position)),
  pathDistance: meters(pathDistance),
  phase,
  event,
});

const computeDragAcceleration = (velocity: Vector3DVelocity): number => {
  const speed = magnitude3D(velocity);
  if (speed === 0) {
    return 0;
  }

  return (0.5 * AIR_DENSITY * AIR_DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed) / BALL_MASS;
};

const applyBounce = (
  velocity: Vector3DVelocity,
  bounceRetention: number,
  spinInfluence: number,
): Vector3DVelocity => {
  const vx = (velocity.x as number) * SURFACE_DAMPING * (1 - spinInfluence * SPIN_DECAY);
  const vy = (velocity.y as number) * SURFACE_DAMPING * (1 - spinInfluence * SPIN_DECAY);
  const vz = -(velocity.z as number) * bounceRetention;

  return toVelocity(vx, vy, vz);
};

const computeSpinInfluence = (spinRpm: number, speed: number): number => {
  if (speed <= 0) {
    return 0;
  }
  const spinRatio = Math.min(spinRpm / 3000, 1);
  return spinRatio * Math.min(speed / 50, 1);
};

const decayRateForFriction = (friction: FrictionLevel): number =>
  FRICTION_COEFFICIENTS[friction] * 1.15;

type UnitlessVector2D = { x: number; y: number };

const normalise2D = (vector: Vector2DVelocity): UnitlessVector2D => {
  const magnitude = magnitude2D(vector);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (vector.x as number) / magnitude,
    y: (vector.y as number) / magnitude,
  };
};

export const simulateRollPhase = (
  startPosition: Vector3D,
  startVelocity: Vector3DVelocity,
  startTime: number,
  pathDistance: number,
  field: FieldConfig,
  options: ComputeBallPathOptions,
): RollPhaseResult => {
  const timeStep = options.timeStep ?? DEFAULT_TIME_STEP;
  const maxTime = options.maxTime ?? MAX_SIMULATION_TIME;
  const velocity2D: Vector2DVelocity = {
    x: startVelocity.x,
    y: startVelocity.y,
  };
  const direction = normalise2D(velocity2D);
  const initialSpeed = magnitude2D(velocity2D);
  const decayRate = decayRateForFriction(field.friction);

  let time = startTime;
  let currentSpeed = initialSpeed;
  let position = { ...startPosition, z: meters(0) };
  let cumulativeDistance = pathDistance;

  const samples: SimulationSample[] = [];
  let boundarySample: SimulationSample | undefined;

  while (time < maxTime && currentSpeed > MIN_ROLLING_SPEED) {
    const decayFactor = Math.exp(-decayRate * timeStep);
    const previousSpeed = currentSpeed;
    currentSpeed *= decayFactor;

    const averageSpeed = (previousSpeed + currentSpeed) / 2;
    const distanceStep = averageSpeed * timeStep;

    const nextX = (position.x as number) + direction.x * distanceStep;
    const nextY = (position.y as number) + direction.y * distanceStep;

    position = toVector3D(nextX, nextY, 0);
    cumulativeDistance += distanceStep;
    time += timeStep;

    const velocity = toVelocity(direction.x * currentSpeed, direction.y * currentSpeed, 0);
    const sample = createSample(time, position, velocity, 'roll', cumulativeDistance);
    samples.push(sample);

    const radius = magnitude2D({ x: position.x, y: position.y });
    if (radius >= (field.boundaryRadius as number)) {
      boundarySample = { ...sample, phase: 'outOfPlay', event: 'boundary-four' };
      samples.push(boundarySample);
      break;
    }
  }

  if (!boundarySample) {
    const stopSample = createSample(
      time,
      position,
      toVelocity(0, 0, 0),
      'stopped',
      cumulativeDistance,
      'stopped',
    );
    samples.push(stopSample);
    return { samples, stopSample };
  }

  return {
    samples,
    boundarySample,
    stopSample: boundarySample,
  };
};

export const computeBallPath = (
  shot: Shot,
  field: FieldConfig,
  options: ComputeBallPathOptions = {},
): BallPathResult => {
  const timeStep = options.timeStep ?? DEFAULT_TIME_STEP;
  const maxTime = options.maxTime ?? MAX_SIMULATION_TIME;

  const samples: SimulationSample[] = [];
  const bounceSamples: SimulationSample[] = [];

  const speed = shot.speed as number;
  const azimuth = degToRad(shot.azimuth as number);
  const elevation = degToRad(shot.elevation as number);
  const launchPosition = shot.launchPosition;
  const spinInfluence = computeSpinInfluence(shot.spinRpm, speed);

  const horizontalSpeed = speed * Math.cos(elevation);
  let velocity = toVelocity(
    horizontalSpeed * Math.sin(azimuth),
    horizontalSpeed * Math.cos(azimuth),
    speed * Math.sin(elevation),
  );

  let position = { ...launchPosition };
  let time = 0;
  let cumulativeDistance = 0;
  let isRolling = false;
  let boundarySample: SimulationSample | undefined;
  let rollResult: RollPhaseResult | undefined;
  let isSix = false;

  samples.push(createSample(time, position, velocity, 'flight', cumulativeDistance, 'launch'));

  while (time < maxTime) {
    const dragAccel = computeDragAcceleration(velocity);
    const speedMagnitude = magnitude3D(velocity);

    const ax = speedMagnitude === 0 ? 0 : -(velocity.x as number) / speedMagnitude * dragAccel;
    const ay = speedMagnitude === 0 ? 0 : -(velocity.y as number) / speedMagnitude * dragAccel;
    const az = speedMagnitude === 0 ? -GRAVITY : -GRAVITY - (velocity.z as number) / speedMagnitude * dragAccel;

    const newVx = (velocity.x as number) + ax * timeStep;
    const newVy = (velocity.y as number) + ay * timeStep;
    const newVz = (velocity.z as number) + az * timeStep;

    const nextVelocity = toVelocity(newVx, newVy, newVz);

    const nextX = (position.x as number) + newVx * timeStep;
    const nextY = (position.y as number) + newVy * timeStep;
    const nextZ = Math.max((position.z as number) + newVz * timeStep, 0);

    const displacement = Math.sqrt(
      (nextX - (position.x as number)) ** 2 +
        (nextY - (position.y as number)) ** 2 +
        (nextZ - (position.z as number)) ** 2,
    );
    cumulativeDistance += displacement;

    time += timeStep;
    position = toVector3D(nextX, nextY, nextZ);
    velocity = nextVelocity;

    const radius = magnitude2D({ x: position.x, y: position.y });

    if (radius >= (field.boundaryRadius as number)) {
      const event: SimulationEvent =
        (position.z as number) > (field.ropeHeight as number) ? 'boundary-six' : 'boundary-four';
      boundarySample = createSample(time, position, velocity, 'outOfPlay', cumulativeDistance, event);
      samples.push(boundarySample);
      isSix = event === 'boundary-six';
      break;
    }

    if ((position.z as number) <= 0 && (velocity.z as number) <= 0) {
      const bouncedVelocity = applyBounce(velocity, field.bounceEnergyRetention, spinInfluence);
      const bounceSample = createSample(time, position, bouncedVelocity, 'bounce', cumulativeDistance, 'bounce');
      samples.push(bounceSample);
      bounceSamples.push(bounceSample);
      velocity = bouncedVelocity;
      if (Math.abs(velocity.z as number) < BOUNCE_VERTICAL_THRESHOLD) {
        isRolling = true;
        const rollStart = createSample(time, toVector3D(position.x as number, position.y as number, 0), velocity, 'roll', cumulativeDistance);
        samples.push(rollStart);
        rollResult = simulateRollPhase(
          rollStart.position,
          velocity,
          time,
          cumulativeDistance,
          field,
          options,
        );
        samples.push(...rollResult.samples);
        boundarySample = rollResult.boundarySample;
        break;
      }
    } else {
      samples.push(createSample(time, position, velocity, 'flight', cumulativeDistance));
    }
  }

  if (!boundarySample && !isRolling) {
    const stopSample = createSample(time, position, toVelocity(0, 0, 0), 'stopped', cumulativeDistance, 'stopped');
    samples.push(stopSample);
    return {
      samples,
      bounceSamples,
      stopSample,
      isSix,
    };
  }

  const stopSample =
    boundarySample ??
    rollResult?.stopSample ??
    createSample(time, position, toVelocity(0, 0, 0), 'stopped', cumulativeDistance, 'stopped');

  return {
    samples,
    boundarySample,
    bounceSamples,
    rollStartIndex: isRolling ? samples.findIndex((sample) => sample.phase === 'roll') : undefined,
    stopSample,
    isSix,
  };
};
