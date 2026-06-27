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

const VISIBLE_ROWS = 3;

function readClassic7ReelCap(el: HTMLElement): number | null {
  const machine = el.closest(".casino-machine--classic7") as HTMLElement | null;
  if (!machine) return null;
  const raw = getComputedStyle(machine).getPropertyValue("--classic7-reel-max-h").trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function capMetricsForClassic7(el: HTMLElement, metrics: ReelMetrics): ReelMetrics {
  const cap = readClassic7ReelCap(el);
  if (!cap || metrics.windowHeight <= cap) return metrics;

  const cellHeight = Math.max(52, Math.floor(cap / VISIBLE_ROWS));
  const windowHeight = cellHeight * VISIBLE_ROWS;
  return {
    ...metrics,
    cellHeight,
    windowHeight,
    symbolSize: Math.round(cellHeight * 0.69),
  };
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
    const stage = (el.closest(".slot-screen-viewport") ??
      el.closest(".classic7-screen")) as HTMLElement | null;
    const w = el.clientWidth || stage?.clientWidth || 320;
    const stageH = stage?.clientHeight ?? 0;
    const m = capMetricsForClassic7(el, computeMetrics(w, stageH));

    applyVars(el, m);
    if (stage) applyVars(stage, m);
    const frame = el.closest(".slot-payline-reels") as HTMLElement | null;
    if (frame) applyVars(frame, m);
    const paylineFrame = el.closest(".slot-payline-frame") as HTMLElement | null;
    if (paylineFrame) applyVars(paylineFrame, m);

    setMetrics((prev) => {
      if (
        Math.abs(prev.cellHeight - m.cellHeight) < 4 &&
        Math.abs(prev.windowHeight - m.windowHeight) < 12 &&
        prev.isMobile === m.isMobile &&
        Math.abs(prev.viewportWidth - m.viewportWidth) < 8
      ) {
        return prev;
      }
      return m;
    });
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const stage = (el.closest(".slot-screen-viewport") ??
      el.closest(".classic7-screen")) as HTMLElement | null;

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
