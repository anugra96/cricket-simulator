import { useId } from 'react';
import type { ChangeEvent } from 'react';

export interface SliderProps {
  id?: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  description?: string;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

export const Slider = ({
  id,
  label,
  min,
  max,
  step = 0.1,
  value,
  onChange,
  unit,
  description,
  disabled,
  formatValue,
}: SliderProps) => {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const descriptionId = `${sliderId}-description`;

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    onChange(Number.isNaN(nextValue) ? value : nextValue);
  };

  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <div className="slider">
      <label className="slider-label" htmlFor={sliderId}>
        <span>{label}</span>
        <span className="slider-value">
          {displayValue}
          {unit ? <span className="slider-unit">{unit}</span> : null}
        </span>
      </label>
      <div className="slider-track">
        <input
          id={sliderId}
          className="slider-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleRangeChange}
          aria-describedby={description ? descriptionId : undefined}
          disabled={disabled}
        />
      </div>
      {description ? (
        <p id={descriptionId} className="slider-description">
          {description}
        </p>
      ) : null}
    </div>
  );
};
