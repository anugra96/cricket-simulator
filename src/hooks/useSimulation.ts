import { useMemo } from 'react';

import type {
  Batsman,
  FieldConfig,
  Fielder,
  SimulationPath,
  SimulationResult,
  Shot,
  Seconds,
} from '@types';
import {
  createDefaultBatsmen,
  createDefaultFieldConfig,
  createDefaultFielders,
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
      const intercept = earliestIntercept(
        pathResult.samples,
        fielders,
        interceptBuffer ?? DEFAULT_FIELDER_BUFFER,
      );
      const outcome = estimateRuns({
        fieldConfig: field,
        batsmen,
        boundarySample: pathResult.boundarySample,
        isSix: pathResult.isSix,
        interception: intercept,
        stopSample: pathResult.stopSample,
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
