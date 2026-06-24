"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ReelMetrics = {
  cellHeight: number;
  symbolSize: number;
  windowHeight: number;
};

const DEFAULT: ReelMetrics = {
  cellHeight: 60,
  symbolSize: 42,
  windowHeight: 180,
};

const ReelMetricsContext = createContext<ReelMetrics>(DEFAULT);

export function useReelMetrics() {
  return useContext(ReelMetricsContext);
}

function computeMetrics(viewportWidth: number): ReelMetrics {
  const cellHeight = Math.max(52, Math.min(76, Math.floor(viewportWidth * 0.19)));
  const symbolSize = Math.round(cellHeight * 0.62);
  return {
    cellHeight,
    symbolSize,
    windowHeight: cellHeight * 3,
  };
}

export function ReelMetricsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ReelMetrics>(DEFAULT);

  const applyMetrics = useCallback((el: HTMLElement, m: ReelMetrics) => {
    el.style.setProperty("--reel-cell-h", `${m.cellHeight}px`);
    el.style.setProperty("--reel-window-h", `${m.windowHeight}px`);
    el.style.setProperty("--reel-symbol-size", `${m.symbolSize}px`);
    el.style.setProperty("--slot-symbol-max", "80%");
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth || 320;
      const m = computeMetrics(w);
      applyMetrics(el, m);
      setMetrics(m);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyMetrics]);

  return (
    <ReelMetricsContext.Provider value={metrics}>
      <div
        ref={rootRef}
        className="slot-reels-viewport"
        style={{ height: metrics.windowHeight }}
      >
        {children}
      </div>
    </ReelMetricsContext.Provider>
  );
}
