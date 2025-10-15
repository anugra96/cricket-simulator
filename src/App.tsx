import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';

import { ControlsPanel } from '@components/ControlsPanel';
import { FieldCanvas } from '@components/FieldCanvas';
import { FieldLegend } from '@components/FieldLegend';
import { OutcomeHeader } from '@components/OutcomeHeader';
import '@styles/app.css';
import { useShotState } from '@hooks/useShotState';
import { useSimulation } from '@hooks/useSimulation';
import { useResponsiveScale } from '@hooks/useResponsiveScale';
import type { Batsman, FieldConfig, Fielder, ShotOutcome } from '@types';
import {
  createDefaultBatsmen,
  createDefaultFieldConfig,
  createDefaultFielders,
  meters,
} from '@types';
import { STRINGS } from '@utils/strings';

const fallbackOutcome: ShotOutcome = {
  runs: 0,
  isBoundary: false,
  isDismissal: false,
};

const App = () => {
  const { shot, updateSpeed, updateAzimuth, updateElevation } = useShotState();
  const [field, setField] = useState<FieldConfig>(createDefaultFieldConfig());
  const [fielders, setFielders] = useState<Fielder[]>(() => createDefaultFielders());
  const [batsmen] = useState<Batsman[]>(createDefaultBatsmen());
  const [showLegend, setShowLegend] = useState(false);

  const fieldCardRef = useRef<HTMLDivElement | null>(null);
  const responsive = useResponsiveScale(fieldCardRef);

  const simulation = useSimulation(shot, field, fielders, batsmen, {
    timeStep: 0.02,
    maxTime: 12,
  });

  const derived = useMemo(() => {
    if (simulation.path.length === 0) {
      return {
        maxHeight: 0,
        travelDistance: 0,
        hangTime: 0,
      };
    }

    const maxHeight = Math.max(...simulation.path.map((sample) => sample.position.z as number));
    const travelDistance =
      simulation.path[simulation.path.length - 1]?.pathDistance as number | undefined;
    const hangTime = simulation.path[simulation.path.length - 1]?.time as number | undefined;

    return {
      maxHeight: Number.isFinite(maxHeight) ? maxHeight : 0,
      travelDistance: travelDistance ?? 0,
      hangTime: hangTime ?? 0,
    };
  }, [simulation.path]);

  const outcome = simulation.result?.outcome ?? fallbackOutcome;
  const boundarySample = useMemo(
    () => simulation.path.find((sample) => sample.event?.startsWith('boundary')),
    [simulation.path],
  );

  const handleFrictionChange = (value: FieldConfig['friction']) => {
    setField((previous) => ({
      ...previous,
      friction: value,
    }));
  };

  const handleResetField = () => {
    setField((previous) => ({
      ...createDefaultFieldConfig(),
      boundaryRadius: previous.boundaryRadius,
    }));
    setFielders(createDefaultFielders());
  };

  const handleFielderPositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setFielders((previous) =>
        previous.map((fielder) =>
          fielder.id === id
            ? {
                ...fielder,
                position: {
                  x: meters(position.x),
                  y: meters(position.y),
                },
              }
            : fielder,
        ),
      );
    },
    [setFielders],
  );

  return (
    <div className="app">
      <OutcomeHeader outcome={outcome} />

      <div className="layout">
        <section className="field-card">
          <div className="field-card-headline">
            <p className="field-subtitle">{STRINGS.app.fieldSubtitle}</p>
            <button
              type="button"
              className="legend-toggle"
              aria-pressed={showLegend}
              onClick={() => setShowLegend((previous) => !previous)}
            >
              {showLegend ? 'Hide legend' : 'Show legend'}
            </button>
          </div>
          <div
            ref={fieldCardRef}
            className="field-canvas-container"
            style={{ '--field-scale': responsive.scale } as CSSProperties}
          >
            <FieldCanvas
              field={field}
              path={simulation.path}
              fielders={fielders}
              batsmen={batsmen}
              boundarySample={boundarySample}
              interception={simulation.result?.interception}
              onFielderPositionChange={handleFielderPositionChange}
            />
            {showLegend ? (
              <div className="field-legend-overlay">
                <FieldLegend showTitle={false} />
              </div>
            ) : null}
          </div>

          <div className="field-meta">
            {simulation.error ? (
              <p className="error-message">{simulation.error.message}</p>
            ) : (
              <dl className="field-insights">
                <div>
                  <dt>{STRINGS.app.peakHeight}</dt>
                  <dd>{derived.maxHeight.toFixed(1)} m</dd>
                </div>
                <div>
                  <dt>{STRINGS.app.distanceTravelled}</dt>
                  <dd>{derived.travelDistance.toFixed(1)} m</dd>
                </div>
                <div>
                  <dt>{STRINGS.app.hangTime}</dt>
                  <dd>{derived.hangTime.toFixed(2)} s</dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <ControlsPanel
          shot={shot}
          field={field}
          onSpeedChange={updateSpeed}
          onAzimuthChange={updateAzimuth}
          onElevationChange={updateElevation}
          onFrictionChange={handleFrictionChange}
          onResetField={handleResetField}
        />
      </div>
    </div>
  );
};

export default App;
