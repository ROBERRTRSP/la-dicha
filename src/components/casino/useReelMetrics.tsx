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

const MOBILE_MAX_WIDTH = 768;

export type ReelMetrics = {
  cellHeight: number;
  symbolSize: number;
  windowHeight: number;
  viewportWidth: number;
  isMobile: boolean;
};

const DEFAULT: ReelMetrics = {
  cellHeight: 68,
  symbolSize: 44,
  windowHeight: 204,
  viewportWidth: 360,
  isMobile: true,
};

const ReelMetricsContext = createContext<ReelMetrics>(DEFAULT);

export function useReelMetrics() {
  return useContext(ReelMetricsContext);
}

function computeMetrics(viewportWidth: number, stageHeight = 0): ReelMetrics {
  const fromWidth = Math.floor(viewportWidth * 0.26);
  const fromStage =
    stageHeight > 96 ? Math.floor((stageHeight * 0.94) / 3) : 0;
  const cellHeight = Math.max(
    58,
    Math.min(102, Math.max(fromWidth, fromStage))
  );
  const symbolSize = Math.round(cellHeight * 0.64);
  return {
    cellHeight,
    symbolSize,
    windowHeight: cellHeight * 3,
    viewportWidth,
    isMobile: viewportWidth <= MOBILE_MAX_WIDTH,
  };
}

function applyVars(el: HTMLElement, m: ReelMetrics) {
  el.style.setProperty("--reel-cell-h", `${m.cellHeight}px`);
  el.style.setProperty("--reel-window-h", `${m.windowHeight}px`);
  el.style.setProperty("--reel-symbol-size", `${m.symbolSize}px`);
  el.style.setProperty("--slot-symbol-max", "82%");
}

export function ReelMetricsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ReelMetrics>(DEFAULT);

  const syncMetrics = useCallback((el: HTMLElement) => {
    const stage = el.closest(".slot-screen-viewport") as HTMLElement | null;
    const w = el.clientWidth || stage?.clientWidth || 320;
    const stageH = stage?.clientHeight ?? 0;
    const m = computeMetrics(w, stageH);

    applyVars(el, m);
    if (stage) applyVars(stage, m);
    const frame = el.closest(".slot-payline-reels") as HTMLElement | null;
    if (frame) applyVars(frame, m);
    const paylineFrame = el.closest(".slot-payline-frame") as HTMLElement | null;
    if (paylineFrame) applyVars(paylineFrame, m);

    setMetrics(m);
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const stage = el.closest(".slot-screen-viewport") as HTMLElement | null;

    const update = () => syncMetrics(el);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (stage) ro.observe(stage);
    return () => ro.disconnect();
  }, [syncMetrics]);

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
