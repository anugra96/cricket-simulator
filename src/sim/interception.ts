import type {
  Fielder,
  InterceptionResult,
  Seconds,
  SimulationPath,
  SimulationSample,
} from '@types';
import { meters, seconds } from '@types';

const DEFAULT_BUFFER = seconds(0.1);
const RUN_SPEED_FLOOR = 3.2;
const MAX_AIR_HEIGHT_FOR_CHASE = 1.2;

const distance2D = (sample: SimulationSample, fielder: Fielder): number =>
  Math.hypot(
    (sample.position.x as number) - (fielder.position.x as number),
    (sample.position.y as number) - (fielder.position.y as number),
  );

const canAttemptIntercept = (sample: SimulationSample): boolean => {
  if (sample.phase === 'outOfPlay') {
    return false;
  }
  if (sample.phase === 'flight' && (sample.position.z as number) > MAX_AIR_HEIGHT_FOR_CHASE) {
    return false;
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
  const cutoffIndex = boundaryIndex >= 0 ? boundaryIndex + 1 : path.length;
  const additionalBuffer = buffer as number;

  let bestResult: InterceptionResult | undefined;
  let bestTime = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cutoffIndex; i += 1) {
    const sample = path[i];
    if (!canAttemptIntercept(sample)) {
      continue;
    }

    const ballTime = sample.time as number;

    for (const fielder of fielders) {
      const reaction = fielder.reactionTime as number;
      const pickup = fielder.pickupBuffer as number;
      const runSpeed = Math.max(fielder.maxSpeed as number, RUN_SPEED_FLOOR);

      const timeAvailable = ballTime - reaction;
      if (timeAvailable <= 0) {
        continue;
      }

      const distance = distance2D(sample, fielder);
      if (distance > runSpeed * timeAvailable) {
        continue;
      }

      const interceptTime = ballTime + pickup + additionalBuffer;
      if (interceptTime < bestTime) {
        bestTime = interceptTime;
        bestResult = {
          fielderId: fielder.id,
          interceptTime: seconds(interceptTime),
          interceptPosition: {
            x: meters(sample.position.x as number),
            y: meters(sample.position.y as number),
          },
          reachedBoundary: false,
        };
      }
    }

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
