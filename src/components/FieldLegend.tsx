import '@styles/legend.css';
import { STRINGS } from '@utils/strings';

const legendItems: Array<{ key: keyof typeof STRINGS.legend; className: string }> = [
  { key: 'boundary', className: 'legend-swatch boundary' },
  { key: 'innerCircle', className: 'legend-swatch inner-circle' },
  { key: 'flightPath', className: 'legend-swatch flight-path' },
  { key: 'rollPath', className: 'legend-swatch roll-path' },
  { key: 'bouncePoint', className: 'legend-swatch bounce-point' },
  { key: 'interceptPoint', className: 'legend-swatch intercept-point' },
  { key: 'boundaryPoint', className: 'legend-swatch boundary-point' },
];

export interface FieldLegendProps {
  className?: string;
  showTitle?: boolean;
}

export const FieldLegend = ({ className, showTitle = true }: FieldLegendProps) => (
  <section
    className={[
      'field-legend',
      showTitle ? 'with-title' : 'overlay',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    aria-label={STRINGS.legend.title}
  >
    {showTitle ? <h3>{STRINGS.legend.title}</h3> : null}
    <ul>
      {legendItems.map((item) => (
        <li key={item.key}>
          <span className={item.className} aria-hidden="true" />
          <span>{STRINGS.legend[item.key]}</span>
        </li>
      ))}
    </ul>
  </section>
);
