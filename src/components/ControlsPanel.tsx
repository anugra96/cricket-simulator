import type { FieldConfig, FrictionLevel, Shot } from '@types';
import { Slider } from './Slider';
import '@styles/controls.css';
import { STRINGS } from '@utils/strings';

export interface ControlsPanelProps {
  shot: Shot;
  field: FieldConfig;
  onSpeedChange: (value: number) => void;
  onAzimuthChange: (value: number) => void;
  onElevationChange: (value: number) => void;
  onFrictionChange: (value: FrictionLevel) => void;
  onResetField: () => void;
}

const FRICTION_LEVELS: FrictionLevel[] = ['slow', 'average', 'fast'];

export const ControlsPanel = ({
  shot,
  field,
  onSpeedChange,
  onAzimuthChange,
  onElevationChange,
  onFrictionChange,
  onResetField,
}: ControlsPanelProps) => {
  const frictionIndex = Math.max(FRICTION_LEVELS.indexOf(field.friction), 0);

  return (
    <section className="controls-panel" aria-label="Simulation controls">
      <div className="control-block">
        <Slider
          label={STRINGS.controls.batSpeed}
          min={10}
          max={45}
          step={0.5}
          unit="m/s"
          value={shot.speed as number}
          onChange={onSpeedChange}
          description={STRINGS.controls.batSpeedDescription}
        />
      </div>

      <div className="control-block">
        <Slider
          label={STRINGS.controls.azimuth}
          min={0}
          max={359}
          step={1}
          unit="deg"
          value={shot.azimuth as number}
          onChange={onAzimuthChange}
          description={STRINGS.controls.azimuthDescription}
        />
      </div>

      <div className="control-block">
        <Slider
          label={STRINGS.controls.elevation}
          min={0}
          max={35}
          step={0.5}
          unit="deg"
          value={shot.elevation as number}
          onChange={onElevationChange}
          description={STRINGS.controls.elevationDescription}
        />
      </div>

      <button type="button" onClick={onResetField} className="panel-reset compact">
        {STRINGS.controls.resetField}
      </button>

      <div className="control-block">
        <Slider
          label={STRINGS.controls.frictionSlider}
          min={0}
          max={FRICTION_LEVELS.length - 1}
          step={1}
          value={frictionIndex}
          onChange={(value) => {
            const nextIndex = Math.round(value);
            const next = FRICTION_LEVELS[Math.min(Math.max(nextIndex, 0), FRICTION_LEVELS.length - 1)];
            onFrictionChange(next);
          }}
          formatValue={(value) => FRICTION_LEVELS[Math.round(value)]}
          description={STRINGS.controls.frictionDescription}
        />
      </div>

    </section>
  );
};
