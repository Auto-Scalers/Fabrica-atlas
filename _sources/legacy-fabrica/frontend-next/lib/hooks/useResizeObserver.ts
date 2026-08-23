'use client';

import { useState, useEffect, RefObject } from 'react';

export interface DimensionState {
  width: number;
  height: number;
}

export function useResizeObserver(ref: RefObject<HTMLElement | null>): DimensionState {
  const [dimensions, setDimensions] = useState<DimensionState>({ width: 0, height: 0 });

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const entry = entries[0];
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [ref]);

  return dimensions;
}

export default useResizeObserver;
