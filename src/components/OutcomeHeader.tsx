import type { InterceptionResult, ShotOutcome } from '@types';
import { STRINGS } from '@utils/strings';
import '@styles/outcome.css';

const formatTime = (time?: number): string =>
  time !== undefined ? `${time.toFixed(2)} s` : 'n/a';

const outcomeIcon = (outcome: ShotOutcome): string => {
  if (outcome.isBoundary) {
    return outcome.runs === 6 ? '[6]' : '[4]';
  }
  if (outcome.runs >= 2) {
    return '[++]';
  }
  if (outcome.runs === 1) {
    return '[+ ]';
  }
  return '[.]';
};

const outcomeText = (outcome: ShotOutcome): string => {
  if (outcome.isBoundary) {
    return outcome.runs === 6 ? 'Maximum! Cleared the rope.' : 'Four runs, beat the field.';
  }
  if (outcome.runs === 0) {
    return 'Dot ball. Fielders cut it off quickly.';
  }
  if (outcome.runs === 1) {
    return 'Kept it rotated with a safe single.';
  }
  if (outcome.runs === 2) {
    return 'Turned hard for two runs.';
  }
  return 'Great running to squeeze three.';
};

export interface OutcomeHeaderProps {
  outcome: ShotOutcome;
  interception?: InterceptionResult;
}

export const OutcomeHeader = ({ outcome, interception }: OutcomeHeaderProps) => (
  <section className="outcome-header" aria-live="polite">
    <div className="outcome-primary">
      <span className="outcome-icon" aria-hidden="true">
        {outcomeIcon(outcome)}
      </span>
      <div>
        <h1>{`${outcome.runs} ${outcome.runs === 1 ? 'run' : 'runs'}`}</h1>
        <p>{outcomeText(outcome)}</p>
      </div>
    </div>

    <dl className="outcome-stats">
      <div>
        <dt>{STRINGS.outcome.boundaryTime}</dt>
        <dd>{formatTime(outcome.boundaryTime as number | undefined)}</dd>
      </div>
      <div>
        <dt>{STRINGS.outcome.intercept}</dt>
        <dd>{formatTime(outcome.interceptTime as number | undefined)}</dd>
      </div>
      <div>
        <dt>{STRINGS.outcome.fielder}</dt>
        <dd>{interception?.fielderId ?? 'n/a'}</dd>
      </div>
    </dl>

    <p className="outcome-hint">{STRINGS.outcome.hint}</p>
  </section>
);
