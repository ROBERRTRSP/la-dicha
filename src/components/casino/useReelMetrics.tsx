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
import { computeReelMetrics } from "@/lib/slots/reel-motion";

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

function computeMetrics(viewportWidth: number, stageHeight = 0) {
  return computeReelMetrics(viewportWidth, stageHeight);
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
