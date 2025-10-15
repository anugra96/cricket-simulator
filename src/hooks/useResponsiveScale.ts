import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';

export interface ResponsiveScaleState {
  scale: number;
  size: number;
  width: number;
  height: number;
}

export interface ResponsiveScaleOptions {
  baseSize?: number;
  minScale?: number;
}

const DEFAULT_BASE_SIZE = 600;

export const useResponsiveScale = (
  containerRef: MutableRefObject<HTMLElement | null>,
  options: ResponsiveScaleOptions = {},
): ResponsiveScaleState => {
  const { baseSize = DEFAULT_BASE_SIZE, minScale = 0.4 } = options;
  const [state, setState] = useState<ResponsiveScaleState>({
    scale: 1,
    size: baseSize,
    width: baseSize,
    height: baseSize,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateScale = () => {
      const { width, height } = element.getBoundingClientRect();
      const size = Math.min(width, height);
      const scale = Math.max(size / baseSize, minScale);
      setState({
        scale,
        size,
        width,
        height,
      });
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [containerRef, baseSize, minScale]);

  return state;
};
