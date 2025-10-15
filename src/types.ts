type Brand<T, B extends string> = T & { readonly __brand: B };

export type Degrees = Brand<number, 'Degrees'>;
export type Radians = Brand<number, 'Radians'>;
export type Meters = Brand<number, 'Meters'>;
export type Seconds = Brand<number, 'Seconds'>;
export type MetersPerSecond = Brand<number, 'MetersPerSecond'>;
export type MetersPerSecondSquared = Brand<number, 'MetersPerSecondSquared'>;

export const degrees = (value: number): Degrees => value as Degrees;
export const radians = (value: number): Radians => value as Radians;
export const meters = (value: number): Meters => value as Meters;
export const seconds = (value: number): Seconds => value as Seconds;
export const metersPerSecond = (value: number): MetersPerSecond => value as MetersPerSecond;
export const metersPerSecondSquared = (value: number): MetersPerSecondSquared =>
  value as MetersPerSecondSquared;

export type Vector2D = {
  x: Meters;
  y: Meters;
};

export type Vector3D = Vector2D & {
  z: Meters;
};

export type Vector2DVelocity = {
  x: MetersPerSecond;
  y: MetersPerSecond;
};

export type Vector3DVelocity = Vector2DVelocity & {
  z: MetersPerSecond;
};

export type FrictionLevel = 'slow' | 'average' | 'fast';

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'runOut'
  | 'stumped'
  | 'lbw'
  | 'hitWicket'
  | 'obstructingField'
  | 'retired';

export interface Shot {
  speed: MetersPerSecond;
  azimuth: Degrees;
  elevation: Degrees;
  launchPosition: Vector3D;
  spinRpm: number;
}

export interface FieldConfig {
  boundaryRadius: Meters;
  pitchLength: Meters;
  innerCircleRadius: Meters;
  friction: FrictionLevel;
  bounceEnergyRetention: number;
  ropeHeight: Meters;
}

export interface Fielder {
  id: string;
  name: string;
  position: Vector2D;
  number?: number;
  reactionTime: Seconds;
  maxSpeed: MetersPerSecond;
  acceleration: MetersPerSecondSquared;
  pickupBuffer: Seconds;
}

export interface Batsman {
  id: string;
  name: string;
  runnerSpeed: MetersPerSecond;
  creasePosition: Vector2D;
}

export type SimulationPhase = 'flight' | 'bounce' | 'roll' | 'stopped' | 'outOfPlay';

export type SimulationEvent = 'launch' | 'bounce' | 'boundary-four' | 'boundary-six' | 'stopped';

export interface SimulationSample {
  time: Seconds;
  position: Vector3D;
  velocity: Vector3DVelocity;
  speed: MetersPerSecond;
  distanceFromOrigin: Meters;
  pathDistance: Meters;
  phase: SimulationPhase;
  event?: SimulationEvent;
}

export type SimulationPath = SimulationSample[];

export interface InterceptionResult {
  fielderId?: string;
  interceptTime?: Seconds;
  interceptPosition?: Vector2D;
  reachedBoundary: boolean;
}

export interface ShotOutcome {
  runs: number;
  isBoundary: boolean;
  isDismissal: boolean;
  dismissalType?: DismissalType;
  interceptedBy?: string;
  interceptTime?: Seconds;
  boundaryTime?: Seconds;
}

export interface SimulationResult {
  samples: SimulationSample[];
  outcome: ShotOutcome;
  interception?: InterceptionResult;
}

export const DEFAULT_BOUNDARY_RADIUS = meters(65);
export const DEFAULT_PITCH_LENGTH = meters(20.12);
export const DEFAULT_INNER_CIRCLE_RADIUS = meters(27.43);
export const DEFAULT_ROPE_HEIGHT = meters(0.7);
export const DEFAULT_BOUNCE_ENERGY_RETENTION = 0.55;

export const FRICTION_COEFFICIENTS: Record<FrictionLevel, number> = {
  slow: 0.65,
  average: 0.55,
  fast: 0.45,
};

export const createDefaultFieldConfig = (): FieldConfig => ({
  boundaryRadius: DEFAULT_BOUNDARY_RADIUS,
  pitchLength: DEFAULT_PITCH_LENGTH,
  innerCircleRadius: DEFAULT_INNER_CIRCLE_RADIUS,
  friction: 'average',
  bounceEnergyRetention: DEFAULT_BOUNCE_ENERGY_RETENTION,
  ropeHeight: DEFAULT_ROPE_HEIGHT,
});

export const createDefaultFielders = (): Fielder[] => [
  {
    id: 'deep-cover',
    name: 'Deep Cover',
    number: 4,
    position: { x: meters(35), y: meters(40) },
    reactionTime: seconds(0.9),
    maxSpeed: metersPerSecond(7.5),
    acceleration: metersPerSecondSquared(3.6),
    pickupBuffer: seconds(0.5),
  },
  {
    id: 'long-off',
    name: 'Long Off',
    number: 18,
    position: { x: meters(10), y: meters(60) },
    reactionTime: seconds(1),
    maxSpeed: metersPerSecond(7.2),
    acceleration: metersPerSecondSquared(3.2),
    pickupBuffer: seconds(0.6),
  },
  {
    id: 'square-leg',
    name: 'Square Leg',
    number: 23,
    position: { x: meters(-25), y: meters(-15) },
    reactionTime: seconds(0.85),
    maxSpeed: metersPerSecond(7.8),
    acceleration: metersPerSecondSquared(3.8),
    pickupBuffer: seconds(0.45),
  },
  {
    id: 'fine-leg',
    name: 'Fine Leg',
    number: 7,
    position: { x: meters(-15), y: meters(-55) },
    reactionTime: seconds(1.05),
    maxSpeed: metersPerSecond(7),
    acceleration: metersPerSecondSquared(3),
    pickupBuffer: seconds(0.6),
  },
];

export const createDefaultBatsmen = (): Batsman[] => [
  {
    id: 'striker',
    name: 'Striker',
    runnerSpeed: metersPerSecond(6.5),
    creasePosition: { x: meters(0), y: meters(-DEFAULT_PITCH_LENGTH / 2) },
  },
  {
    id: 'non-striker',
    name: 'Non-Striker',
    runnerSpeed: metersPerSecond(6.4),
    creasePosition: { x: meters(0), y: meters(DEFAULT_PITCH_LENGTH / 2) },
  },
];

export const createDefaultShot = (): Shot => ({
  speed: metersPerSecond(30),
  azimuth: degrees(0),
  elevation: degrees(10),
  launchPosition: { x: meters(0), y: meters(0), z: meters(1) },
  spinRpm: 1500,
});
