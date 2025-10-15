import type { ShotOutcome } from '@types';
import '@styles/outcome.css';

export interface OutcomeHeaderProps {
  outcome: ShotOutcome;
}

export const OutcomeHeader = ({ outcome }: OutcomeHeaderProps) => (
  <section className="outcome-header" aria-live="polite">
    <span className="outcome-runs-value">{outcome.runs}</span>
    <span className="outcome-runs-label">{outcome.runs === 1 ? 'run' : 'runs'}</span>
  </section>
);
