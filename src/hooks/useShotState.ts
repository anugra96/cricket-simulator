import { useCallback, useState } from 'react';

import type { Shot, Vector3D } from '@types';
import { createDefaultShot, degrees, meters, metersPerSecond } from '@types';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export interface UseShotStateOptions {
  initialShot?: Shot;
}

export interface ShotStateApi {
  shot: Shot;
  setShot: (updater: Shot | ((previous: Shot) => Shot)) => void;
  reset: () => void;
  updateAzimuth: (value: number) => void;
  updateElevation: (value: number) => void;
  updateSpeed: (value: number) => void;
  updateSpin: (value: number) => void;
  updateLaunchHeight: (value: number) => void;
  updateLaunchPosition: (position: Partial<Vector3D>) => void;
}

export const useShotState = (options: UseShotStateOptions = {}): ShotStateApi => {
  const initialShot = options.initialShot ?? createDefaultShot();
  const [shot, setShotInternal] = useState<Shot>(initialShot);

  const setShot = useCallback((updater: Shot | ((previous: Shot) => Shot)) => {
    setShotInternal((previous) =>
      typeof updater === 'function' ? (updater as (current: Shot) => Shot)(previous) : updater,
    );
  }, []);

  const reset = useCallback(() => setShotInternal(initialShot), [initialShot]);

  const updateAzimuth = useCallback(
    (value: number) => {
      setShotInternal((previous) => ({
        ...previous,
        azimuth: degrees(((value % 360) + 360) % 360),
      }));
    },
    [],
  );

  const updateElevation = useCallback(
    (value: number) => {
      setShotInternal((previous) => ({
        ...previous,
        elevation: degrees(clamp(value, 0, 60)),
      }));
    },
    [],
  );

  const updateSpeed = useCallback(
    (value: number) => {
      setShotInternal((previous) => ({
        ...previous,
        speed: metersPerSecond(Math.max(value, 0)),
      }));
    },
    [],
  );

  const updateSpin = useCallback(
    (value: number) => {
      setShotInternal((previous) => ({
        ...previous,
        spinRpm: Math.max(0, Math.round(value)),
      }));
    },
    [],
  );

  const updateLaunchHeight = useCallback(
    (value: number) => {
      setShotInternal((previous) => ({
        ...previous,
        launchPosition: {
          ...previous.launchPosition,
          z: meters(Math.max(value, 0)),
        },
      }));
    },
    [],
  );

  const updateLaunchPosition = useCallback((position: Partial<Vector3D>) => {
    setShotInternal((previous) => ({
      ...previous,
      launchPosition: {
        ...previous.launchPosition,
        ...('x' in position && position.x !== undefined
          ? { x: meters(position.x as number) }
          : {}),
        ...('y' in position && position.y !== undefined
          ? { y: meters(position.y as number) }
          : {}),
        ...('z' in position && position.z !== undefined
          ? { z: meters(position.z as number) }
          : {}),
      },
    }));
  }, []);

  return {
    shot,
    setShot,
    reset,
    updateAzimuth,
    updateElevation,
    updateSpeed,
    updateSpin,
    updateLaunchHeight,
    updateLaunchPosition,
  };
};
