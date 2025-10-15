import { useMemo } from 'react';

import type {
  Batsman,
  FieldConfig,
  Fielder,
  SimulationPath,
  SimulationResult,
  Shot,
  Seconds,
  SimulationSample,
} from '@types';
import {
  createDefaultBatsmen,
  createDefaultFieldConfig,
  createDefaultFielders,
  meters,
  metersPerSecond,
  seconds,
} from '@types';
import { computeBallPath, type ComputeBallPathOptions } from '@sim/physics';
import { earliestIntercept } from '@sim/interception';
import { estimateRuns } from '@sim/runsEstimator';

export interface UseSimulationOptions extends ComputeBallPathOptions {
  interceptBuffer?: Seconds;
}

export interface UseSimulationValue {
  path: SimulationPath;
  result: SimulationResult | null;
  boundaryTime?: Seconds;
  isSix: boolean;
  error: Error | null;
}

const DEFAULT_FIELDER_BUFFER = seconds(0.2);
const CAUGHT_RADIUS = 3;
const AIR_CATCH_RADIUS = 2.5;
const RUN_SPEED_FLOOR = 5;

const distance2D = (
  sample: SimulationSample,
  fielder: Fielder,
): number =>
  Math.hypot(
    (sample.position.x as number) - (fielder.position.x as number),
    (sample.position.y as number) - (fielder.position.y as number),
  );

const validateShot = (shot: Shot): string | null => {
  if (!Number.isFinite(shot.speed as number) || (shot.speed as number) <= 0) {
    return 'Shot speed must be greater than zero.';
  }
  if (!Number.isFinite(shot.elevation as number)) {
    return 'Shot elevation is invalid.';
  }
  if (!Number.isFinite(shot.azimuth as number)) {
    return 'Shot azimuth is invalid.';
  }

  return null;
};

export const useSimulation = (
  shot: Shot | undefined,
  field: FieldConfig = createDefaultFieldConfig(),
  fielders: Fielder[] = createDefaultFielders(),
  batsmen: Batsman[] = createDefaultBatsmen(),
  options: UseSimulationOptions = {},
): UseSimulationValue => {
  const { interceptBuffer, timeStep, maxTime } = options;

  return useMemo(() => {
    if (!shot) {
      return { path: [], result: null, boundaryTime: undefined, isSix: false, error: null };
    }

    const validationMessage = validateShot(shot);
    if (validationMessage) {
      return {
        path: [],
        result: null,
        boundaryTime: undefined,
        isSix: false,
        error: new Error(validationMessage),
      };
    }

    try {
      const pathResult = computeBallPath(shot, field, {
        timeStep,
        maxTime,
      });
      const firstBounce = pathResult.bounceSamples[0];
      let caughtInfo:
        | {
            fielderId: string;
            time: Seconds;
          }
        | undefined;
      let caughtIndex: number | null = null;

      for (let i = 0; i < pathResult.samples.length; i += 1) {
        const sample = pathResult.samples[i];
        if (sample.phase === 'bounce') {
          break;
        }
        if (sample.phase !== 'flight') {
          continue;
        }

        const height = sample.position.z as number;
        if (height <= 0) {
          continue;
        }

        const sampleTime = sample.time as number;

        for (const fielder of fielders) {
          const reaction = fielder.reactionTime as number;
          const runSpeed = Math.max(fielder.maxSpeed as number, RUN_SPEED_FLOOR);
          const timeAvailable = sampleTime - reaction;
          if (timeAvailable <= 0) {
            continue;
          }

          const distance = distance2D(sample, fielder);
          if (distance > runSpeed * timeAvailable || distance > AIR_CATCH_RADIUS) {
            continue;
          }

          caughtInfo = {
            fielderId: fielder.id,
            time: sample.time,
          };
          caughtIndex = i;
          break;
        }

        if (caughtInfo) {
          break;
        }
      }

      if (caughtInfo && caughtIndex !== null) {
        const caughtSample = {
          ...pathResult.samples[caughtIndex],
          phase: 'stopped' as const,
          event: 'stopped' as const,
        };

        pathResult.samples = [
          ...pathResult.samples.slice(0, caughtIndex),
          caughtSample,
        ];
        pathResult.boundarySample = undefined;
        pathResult.bounceSamples = [];
        pathResult.stopSample = caughtSample;
        pathResult.isSix = false;
      } else if (firstBounce) {
        const bounceX = firstBounce.position.x as number;
        const bounceY = firstBounce.position.y as number;
        const bounceTime = firstBounce.time as number;
        let bounceCaughtFielder: Fielder | undefined;

        for (const fielder of fielders) {
          const reaction = fielder.reactionTime as number;
          const runSpeed = Math.max(fielder.maxSpeed as number, RUN_SPEED_FLOOR);
          const timeAvailable = bounceTime - reaction;
          if (timeAvailable <= 0) {
            continue;
          }
          const distance = Math.hypot(
            bounceX - (fielder.position.x as number),
            bounceY - (fielder.position.y as number),
          );
          if (distance <= CAUGHT_RADIUS && distance <= runSpeed * timeAvailable) {
            bounceCaughtFielder = fielder;
            break;
          }
        }

        if (bounceCaughtFielder) {
          caughtInfo = {
            fielderId: bounceCaughtFielder.id,
            time: firstBounce.time,
          };
          const caughtSample = {
            ...firstBounce,
            phase: 'stopped' as const,
            event: 'stopped' as const,
          };
          const bounceIndex = pathResult.samples.findIndex((sample) => sample === firstBounce);
          pathResult.samples = [
            ...pathResult.samples.slice(0, bounceIndex),
            caughtSample,
          ];
          pathResult.boundarySample = undefined;
          pathResult.stopSample = caughtSample;
          pathResult.isSix = false;
        }
      }

      const intercept = earliestIntercept(
        pathResult.samples,
        fielders,
        interceptBuffer ?? DEFAULT_FIELDER_BUFFER,
      );

      if (
        intercept.fielderId &&
        intercept.interceptTime &&
        intercept.interceptPosition &&
        !caughtInfo
      ) {
        const interceptTimeNumber = intercept.interceptTime as number;
        const insertIndex = pathResult.samples.findIndex(
          (sample) => (sample.time as number) >= interceptTimeNumber,
        );
        const previousSample =
          insertIndex > 0 ? pathResult.samples[insertIndex - 1] : pathResult.samples[0];

        const prevPathDistance = previousSample
          ? (previousSample.pathDistance as number)
          : 0;
        const prevPosition = previousSample ? previousSample.position : pathResult.samples[0].position;

        const interceptPosition = intercept.interceptPosition;
        const segmentDistance = Math.hypot(
          (interceptPosition.x as number) - (prevPosition.x as number),
          (interceptPosition.y as number) - (prevPosition.y as number),
        );

        const interceptSample: SimulationSample = {
          time: intercept.interceptTime,
          position: {
            x: interceptPosition.x,
            y: interceptPosition.y,
            z: meters(0),
          },
          velocity: {
            x: metersPerSecond(0),
            y: metersPerSecond(0),
            z: metersPerSecond(0),
          },
          speed: metersPerSecond(0),
          distanceFromOrigin: meters(
            Math.hypot(interceptPosition.x as number, interceptPosition.y as number),
          ),
          pathDistance: meters(prevPathDistance + segmentDistance),
          phase: 'stopped',
          event: 'stopped',
        };

        const truncatedSamples =
          insertIndex >= 0
            ? pathResult.samples.slice(0, insertIndex)
            : pathResult.samples.slice();

        if (
          truncatedSamples.length > 0 &&
          Math.abs(
            (truncatedSamples[truncatedSamples.length - 1].position.x as number) -
              (interceptSample.position.x as number),
          ) < 1e-6 &&
          Math.abs(
            (truncatedSamples[truncatedSamples.length - 1].position.y as number) -
              (interceptSample.position.y as number),
          ) < 1e-6
        ) {
          truncatedSamples[truncatedSamples.length - 1] = interceptSample;
        } else {
          truncatedSamples.push(interceptSample);
        }

        pathResult.samples = truncatedSamples;
        pathResult.boundarySample = undefined;
        pathResult.stopSample = interceptSample;
        pathResult.isSix = false;
      }

      const outcome = estimateRuns({
        fieldConfig: field,
        batsmen,
        boundarySample: pathResult.boundarySample,
        isSix: pathResult.isSix,
        interception: intercept,
        stopSample: pathResult.stopSample,
        caughtInfo,
      });

      const result: SimulationResult = {
        samples: pathResult.samples,
        outcome,
        interception: intercept,
      };

      return {
        path: pathResult.samples,
        result,
        boundaryTime: pathResult.boundarySample?.time,
        isSix: pathResult.isSix,
        error: null,
      };
    } catch (error) {
      return {
        path: [],
        result: null,
        boundaryTime: undefined,
        isSix: false,
        error: error instanceof Error ? error : new Error('Failed to run simulation'),
      };
    }
  }, [shot, field, fielders, batsmen, interceptBuffer, timeStep, maxTime]);
};
