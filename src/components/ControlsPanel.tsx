import type { ChangeEvent } from 'react';

import type { FieldConfig, FrictionLevel, Shot } from '@types';
import { Slider } from './Slider';
import '@styles/controls.css';
import { STRINGS } from '@utils/strings';

export interface ControlsPanelProps {
  shot: Shot;
  field: FieldConfig;
  interceptBuffer: number;
  onSpeedChange: (value: number) => void;
  onAzimuthChange: (value: number) => void;
  onElevationChange: (value: number) => void;
  onSpinChange: (value: number) => void;
  onBoundaryChange: (value: number) => void;
  onFrictionChange: (value: FrictionLevel) => void;
  onPickupBufferChange: (value: number) => void;
  onResetShot: () => void;
  onResetField: () => void;
}

const frictionOptions: Array<{ value: FrictionLevel; label: string }> = [
  { value: 'slow', label: 'Slow' },
  { value: 'average', label: 'Average' },
  { value: 'fast', label: 'Fast' },
];

export const ControlsPanel = ({
  shot,
  field,
  interceptBuffer,
  onSpeedChange,
  onAzimuthChange,
  onElevationChange,
  onSpinChange,
  onBoundaryChange,
  onFrictionChange,
  onPickupBufferChange,
  onResetShot,
  onResetField,
}: ControlsPanelProps) => {
  const handlePickupBufferChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      onPickupBufferChange(Math.max(0, value));
    }
  };

  const handleFrictionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFrictionChange(event.target.value as FrictionLevel);
  };

  return (
    <section className="controls-panel" aria-label="Simulation controls">
      <header className="panel-header">
        <h2>{STRINGS.controls.shotHeader}</h2>
        <button type="button" onClick={onResetShot} className="panel-reset">
          {STRINGS.controls.resetShot}
        </button>
      </header>

      <Slider
        label={STRINGS.controls.batSpeed}
        min={10}
        max={45}
        step={0.5}
        unit="m/s"
        value={shot.speed as number}
        onChange={onSpeedChange}
      />

      <Slider
        label={STRINGS.controls.azimuth}
        min={-90}
        max={90}
        step={1}
        unit="deg"
        value={shot.azimuth as number}
        onChange={onAzimuthChange}
        description={STRINGS.controls.azimuthDescription}
      />

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

      <Slider
        label={STRINGS.controls.spin}
        min={0}
        max={4000}
        step={50}
        unit="rpm"
        value={shot.spinRpm}
        onChange={onSpinChange}
      />

      <header className="panel-header">
        <h2>{STRINGS.controls.fieldHeader}</h2>
        <button type="button" onClick={onResetField} className="panel-reset">
          {STRINGS.controls.resetField}
        </button>
      </header>

      <Slider
        label={STRINGS.controls.boundaryRadius}
        min={45}
        max={85}
        step={1}
        unit="m"
        value={field.boundaryRadius as number}
        onChange={onBoundaryChange}
      />

      <label className="control-field" htmlFor="friction-select">
        <span>{STRINGS.controls.groundFriction}</span>
        <select
          id="friction-select"
          className="control-select"
          value={field.friction}
          onChange={handleFrictionChange}
        >
          {frictionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="control-field" htmlFor="pickup-buffer">
        <span>{STRINGS.controls.pickupBuffer}</span>
        <input
          id="pickup-buffer"
          className="control-input"
          type="number"
          min={0}
          max={2}
          step={0.05}
          value={interceptBuffer.toFixed(2)}
          onChange={handlePickupBufferChange}
        />
      </label>
    </section>
  );
};
