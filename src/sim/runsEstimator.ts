import type {
  Batsman,
  FieldConfig,
  InterceptionResult,
  Seconds,
  ShotOutcome,
  SimulationSample,
} from '@types';

const TURN_BUFFER = 0.55;
const DOUBLE_MARGIN = 0.45;
const TRIPLE_MARGIN = 0.6;
const STOPPING_MARGIN = 0.8;
const MAX_RUNNING_SPEED = 8.1;

export interface OutcomeContext {
  fieldConfig: FieldConfig;
  batsmen: Batsman[];
  boundarySample?: SimulationSample;
  isSix?: boolean;
  interception?: InterceptionResult;
  stopSample: SimulationSample;
  caughtInfo?: {
    fielderId: string;
    time: Seconds;
  };
}

const averageRunnerSpeed = (batsmen: Batsman[]): number => {
  if (batsmen.length === 0) {
    return 6.2;
  }

  const cappedSpeeds = batsmen.map((runner) =>
    Math.min(runner.runnerSpeed as number, MAX_RUNNING_SPEED),
  );

  const sum = cappedSpeeds.reduce((acc, speed) => acc + speed, 0);
  return sum / cappedSpeeds.length;
};

const timeForRuns = (batsmen: Batsman[], fieldConfig: FieldConfig): number[] => {
  const avgSpeed = averageRunnerSpeed(batsmen);
  const runDistance = fieldConfig.pitchLength as number;
  const single = runDistance / avgSpeed + TURN_BUFFER;
  const double = single * 2 + DOUBLE_MARGIN;
  const triple = double + single + TRIPLE_MARGIN;

  return [single, double, triple];
};

const runsFromAvailableTime = (
  availableTime: number,
  batsmen: Batsman[],
  fieldConfig: FieldConfig,
): number => {
  const [single, double, triple] = timeForRuns(batsmen, fieldConfig);

  if (availableTime < single) {
    return 0;
  }
  if (availableTime < double) {
    return 1;
  }
  if (availableTime < triple) {
    return 2;
  }
  return 3;
};

export const estimateRuns = ({
  fieldConfig,
  batsmen,
  boundarySample,
  isSix,
  interception,
  stopSample,
  caughtInfo,
}: OutcomeContext): ShotOutcome => {
  if (caughtInfo) {
    return {
      runs: 0,
      isBoundary: false,
      isDismissal: true,
      dismissalType: 'caught',
      interceptedBy: caughtInfo.fielderId,
      interceptTime: caughtInfo.time,
    };
  }

  if (isSix) {
    return {
      runs: 6,
      isBoundary: true,
      isDismissal: false,
      boundaryTime: boundarySample?.time ?? stopSample.time,
    };
  }

  if (boundarySample) {
    return {
      runs: 4,
      isBoundary: true,
      isDismissal: false,
      boundaryTime: boundarySample.time,
    };
  }

  if (interception?.fielderId && interception.interceptTime) {
    const availableTime = interception.interceptTime as number;
    const runs = runsFromAvailableTime(availableTime, batsmen, fieldConfig);

    return {
      runs,
      isBoundary: false,
      isDismissal: false,
      interceptedBy: interception.fielderId,
      interceptTime: interception.interceptTime,
    };
  }

  const stopTime = stopSample.time as number;
  const runs = runsFromAvailableTime(stopTime + STOPPING_MARGIN, batsmen, fieldConfig);

  return {
    runs,
    isBoundary: false,
    isDismissal: false,
  };
};
