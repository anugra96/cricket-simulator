import type {
  Fielder,
  InterceptionResult,
  Seconds,
  SimulationPath,
  SimulationSample,
} from '@types';
import { meters, seconds } from '@types';

const DEFAULT_BUFFER = seconds(0.3);

const distance2D = (sample: SimulationSample, fielder: Fielder): number =>
  Math.hypot(
    (sample.position.x as number) - (fielder.position.x as number),
    (sample.position.y as number) - (fielder.position.y as number),
  );

const timeToCoverDistance = (
  distance: number,
  maxSpeed: number,
  acceleration: number,
): number => {
  if (distance <= 0) {
    return 0;
  }

  const timeToMaxSpeed = maxSpeed / Math.max(acceleration, 0.1);
  const distanceDuringAcceleration = 0.5 * Math.max(acceleration, 0.1) * timeToMaxSpeed ** 2;

  if (distance <= distanceDuringAcceleration) {
    return Math.sqrt((2 * distance) / Math.max(acceleration, 0.1));
  }

  const remainingDistance = distance - distanceDuringAcceleration;
  return timeToMaxSpeed + remainingDistance / maxSpeed;
};

const canAttemptIntercept = (sample: SimulationSample): boolean => {
  if (sample.phase === 'outOfPlay') {
    return false;
  }
  if (sample.phase === 'flight') {
    return (sample.position.z as number) <= 4;
  }
  return true;
};

export const earliestIntercept = (
  path: SimulationPath,
  fielders: Fielder[],
  buffer: Seconds = DEFAULT_BUFFER,
): InterceptionResult => {
  if (path.length === 0 || fielders.length === 0) {
    return { reachedBoundary: false };
  }

  const boundaryIndex = path.findIndex((sample) => sample.event?.startsWith('boundary'));
  const cutoffIndex = boundaryIndex >= 0 ? boundaryIndex : path.length;
  const additionalBuffer = buffer as number;

  let bestResult: InterceptionResult | undefined;
  let bestTime = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cutoffIndex; i += 1) {
    const sample = path[i];
    if (!canAttemptIntercept(sample)) {
      continue;
    }

    const ballTime = sample.time as number;

    fielders.forEach((fielder) => {
      const distance = distance2D(sample, fielder);
      const travelTime = timeToCoverDistance(
        distance,
        fielder.maxSpeed as number,
        fielder.acceleration as number,
      );
      const arrivalTime =
        (fielder.reactionTime as number) +
        travelTime +
        (fielder.pickupBuffer as number) +
        additionalBuffer;

      if (arrivalTime <= ballTime && arrivalTime < bestTime) {
        bestTime = arrivalTime;
        bestResult = {
          fielderId: fielder.id,
          interceptTime: seconds(arrivalTime),
          interceptPosition: {
            x: meters(sample.position.x as number),
            y: meters(sample.position.y as number),
          },
          reachedBoundary: false,
        };
      }
    });

    if (bestResult) {
      break;
    }
  }

  if (bestResult) {
    return bestResult;
  }

  return {
    reachedBoundary: boundaryIndex >= 0,
  };
};
