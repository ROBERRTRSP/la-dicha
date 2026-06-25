"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlotSymbolSvg } from "./SlotSymbolSvg";
import { ReelMetricsProvider, useReelMetrics } from "./useReelMetrics";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { SlotGameId, WinCell } from "@/lib/slots/types";
import { getSlotGame } from "@/lib/slots/games";
import { getSlotAnimationConfig } from "@/lib/slots/animation-config";
import { cn } from "@/lib/utils";

const VISIBLE_ROWS = 3;
const LOOP_SEGMENT_SIZE = 12;

type ReelPhase = "idle" | "accel" | "spin" | "decel";

function randomSymbol(ids: string[]): string {
  return ids[Math.floor(Math.random() * ids.length)] ?? ids[0];
}

function buildLoopSegment(allIds: string[]): string[] {
  return Array.from({ length: LOOP_SEGMENT_SIZE }, () => randomSymbol(allIds));
}

function buildStrip(
  finalCol: string[],
  allIds: string[],
  repeatCount: number
): string[] {
  const segment = buildLoopSegment(allIds);
  const body: string[] = [];
  for (let i = 0; i < repeatCount; i++) {
    body.push(...segment);
  }
  return [...body, ...finalCol];
}

function loopHeightPx(cellH: number): number {
  return LOOP_SEGMENT_SIZE * cellH;
}

function finalOffset(stripLen: number, cellH: number): number {
  return Math.max(0, (stripLen - VISIBLE_ROWS) * cellH);
}

function drumCellTransform(
  stripIndex: number,
  offset: number,
  cellH: number,
  isMotion: boolean,
  visibleRow: number
): string | undefined {
  if (cellH <= 0) return undefined;

  const windowH = VISIBLE_ROWS * cellH;
  const cellCenterY = stripIndex * cellH + cellH * 0.5 - offset;
  const norm = (cellCenterY - windowH * 0.5) / (cellH * 1.05);

  if (!isMotion && (visibleRow < 0 || visibleRow >= VISIBLE_ROWS)) {
    return undefined;
  }

  const clamped = Math.max(-1.35, Math.min(1.35, norm));
  const rotateX = clamped * -24;
  const scale = 1 - Math.abs(clamped) * 0.16;

  return `perspective(680px) rotateX(${rotateX}deg) scale(${scale})`;
}

function drumCellOpacity(
  stripIndex: number,
  offset: number,
  cellH: number,
  isMotion: boolean
): number | undefined {
  if (!isMotion || cellH <= 0) return undefined;

  const windowH = VISIBLE_ROWS * cellH;
  const cellCenterY = stripIndex * cellH + cellH * 0.5 - offset;
  const norm = Math.abs((cellCenterY - windowH * 0.5) / (cellH * 1.05));
  return Math.max(0.55, 1 - norm * 0.35);
}

function ReelCell({
  symId,
  gameId,
  isWin,
  isScatter,
  settling,
  stripIndex,
  offset,
  cellH,
  visibleRow,
  isMotion,
}: {
  symId: string;
  gameId: SlotGameId;
  isWin?: boolean;
  isScatter?: boolean;
  settling?: boolean;
  stripIndex: number;
  offset: number;
  cellH: number;
  visibleRow: number;
  isMotion: boolean;
}) {
  const wheelStyle = drumCellTransform(
    stripIndex,
    offset,
    cellH,
    isMotion,
    visibleRow
  );
  const motionOpacity = drumCellOpacity(stripIndex, offset, cellH, isMotion);

  return (
    <div
      className={cn(
        "slot-reel-cell",
        isWin && "slot-reel-cell--win",
        isScatter && "slot-reel-cell--scatter",
        settling && "slot-reel-cell--settle",
        isMotion && "slot-reel-cell--spinning"
      )}
    >
      <div
        className="slot-symbol-wrapper"
        style={{
          ...(wheelStyle ? { transform: wheelStyle } : {}),
          ...(motionOpacity !== undefined ? { opacity: motionOpacity } : {}),
        }}
      >
        <SlotSymbolSvg symbolId={symId} gameId={gameId} variant="cell" />
      </div>
    </div>
  );
}

function SlotReelColumn({
  columnIndex,
  finalSymbols,
  gameId,
  allSymbolIds,
  spinning,
  stopGeneration,
  resultReady,
  winRows,
  scatterRows,
  highlight,
  reducedMotion,
  onStopped,
}: {
  columnIndex: number;
  finalSymbols: string[];
  gameId: SlotGameId;
  allSymbolIds: string[];
  spinning: boolean;
  stopGeneration: number;
  resultReady?: boolean;
  winRows: Set<number>;
  scatterRows: Set<number>;
  highlight: boolean;
  reducedMotion?: boolean;
  onStopped?: () => void;
}) {
  const { cellHeight: cellH, isMobile } = useReelMetrics();
  const anim = useMemo(
    () =>
      getSlotAnimationConfig(gameId, {
        mobile: isMobile,
        cellHeight: cellH,
      }),
    [gameId, isMobile, cellH]
  );

  const [strip, setStrip] = useState<string[]>(() =>
    buildStrip(finalSymbols, allSymbolIds, anim.loopRepeats)
  );
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [settling, setSettling] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ReelPhase>("idle");
  const offsetRef = useRef(0);
  const totalOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const accelStartRef = useRef(0);
  const stoppedRef = useRef(false);
  const targetOffsetRef = useRef(0);
  const mountedRef = useRef(false);
  const finalsRef = useRef(finalSymbols);
  const wantStopRef = useRef(false);
  const resultReadyRef = useRef(false);

  useEffect(() => {
    resultReadyRef.current = resultReady ?? false;
  }, [resultReady]);

  useEffect(() => {
    finalsRef.current = finalSymbols;
  }, [finalSymbols]);

  const finishStop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    if (stripRef.current) stripRef.current.style.transition = "";
    setSettling(true);
    window.setTimeout(() => {
      setSettling(false);
      phaseRef.current = "idle";
      setPhase("idle");
      onStopped?.();
    }, anim.settleMs);
  }, [anim.settleMs, onStopped]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const s = buildStrip(finalSymbols, allSymbolIds, anim.loopRepeats);
    const fo = finalOffset(s.length, cellH);
    setStrip(s);
    offsetRef.current = fo;
    totalOffsetRef.current = fo;
    setOffset(fo);
    targetOffsetRef.current = fo;
  }, [allSymbolIds, anim.loopRepeats, cellH, finalSymbols]);

  useEffect(() => {
    if (cellH <= 0) return;
    if (phaseRef.current === "idle" && !spinning) {
      const fo = finalOffset(strip.length, cellH);
      offsetRef.current = fo;
      setOffset(fo);
      targetOffsetRef.current = fo;
    }
  }, [cellH, strip.length, spinning]);

  // Parada forzada: si el giro se cancela (error/timeout en el padre) mientras
  // el carrete sigue en movimiento, vuelve a reposo en lugar de girar sin fin.
  useEffect(() => {
    if (spinning || phaseRef.current === "idle") return;
    cancelAnimationFrame(rafRef.current);
    wantStopRef.current = false;
    stoppedRef.current = true;
    setSettling(false);
    phaseRef.current = "idle";
    setPhase("idle");
    if (stripRef.current) stripRef.current.style.transition = "";
    if (cellH > 0) {
      const fo = finalOffset(strip.length, cellH);
      offsetRef.current = fo;
      setOffset(fo);
    }
  }, [spinning, strip.length, cellH]);

  useEffect(() => {
    if (!spinning) return;

    stoppedRef.current = false;
    wantStopRef.current = false;
    setSettling(false);

    const startFinals = finalsRef.current;
    const newStrip = buildStrip(startFinals, allSymbolIds, anim.loopRepeats);
    targetOffsetRef.current = finalOffset(newStrip.length, cellH);

    setStrip(newStrip);
    offsetRef.current = 0;
    totalOffsetRef.current = 0;
    setOffset(0);
    phaseRef.current = reducedMotion ? "decel" : "accel";
    setPhase(reducedMotion ? "decel" : "accel");
    velocityRef.current = 0;
    accelStartRef.current = performance.now();
    lastFrameRef.current = accelStartRef.current;

    if (stripRef.current) stripRef.current.style.transition = "none";

    const stopAt = reducedMotion
      ? 80 + columnIndex * 40
      : anim.baseSpinMs + columnIndex * anim.columnStopDelayMs;

    const loopH = loopHeightPx(cellH);

    const tick = (now: number) => {
      const dt = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (phaseRef.current === "decel") return;

      if (phaseRef.current === "accel") {
        const elapsed = now - accelStartRef.current;
        const t = Math.min(1, elapsed / anim.accelMs);
        velocityRef.current = anim.maxVelocity * t * t;
      } else if (phaseRef.current === "spin") {
        velocityRef.current = anim.maxVelocity;
      }

      if (phaseRef.current === "accel" || phaseRef.current === "spin") {
        totalOffsetRef.current += velocityRef.current * dt;
        const display = loopH > 0 ? totalOffsetRef.current % loopH : totalOffsetRef.current;
        offsetRef.current = display;
        setOffset(display);

        if (
          phaseRef.current === "accel" &&
          now - accelStartRef.current >= anim.accelMs
        ) {
          phaseRef.current = "spin";
          setPhase("spin");
        }
        // Solo frena cuando ya pasó el tiempo mínimo de giro Y el servidor
        // respondió: así el carrete aterriza en la rejilla real sin saltos.
        if (wantStopRef.current && resultReadyRef.current) {
          beginDecel();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // Frena el carrete hacia la rejilla final del servidor.
    const beginDecel = () => {
      if (phaseRef.current === "decel") return;
      cancelAnimationFrame(rafRef.current);

      const latestFinals = finalsRef.current;
      setStrip((prev) => {
        const tail = prev.slice(-VISIBLE_ROWS).join(",");
        const nextTail = latestFinals.join(",");
        if (tail === nextTail) {
          targetOffsetRef.current = finalOffset(prev.length, cellH);
          return prev;
        }
        const next = [...prev.slice(0, -VISIBLE_ROWS), ...latestFinals];
        targetOffsetRef.current = finalOffset(next.length, cellH);
        return next;
      });

      phaseRef.current = "decel";
      setPhase("decel");

      const snap = targetOffsetRef.current;
      const decelMs = reducedMotion ? 0 : anim.decelMs;
      totalOffsetRef.current = snap;
      requestAnimationFrame(() => {
        if (stripRef.current) {
          stripRef.current.style.transition =
            decelMs > 0
              ? `transform ${decelMs}ms ${anim.decelEasing}`
              : "none";
        }
        offsetRef.current = snap;
        setOffset(snap);
        if (decelMs === 0) finishStop();
      });
    };

    // Sin animación (reduced motion) no hay bucle tick: esperamos el
    // resultado del servidor con un sondeo ligero antes de aterrizar.
    const waitForResult = () => {
      if (resultReadyRef.current) {
        beginDecel();
        return;
      }
      rafRef.current = requestAnimationFrame(waitForResult);
    };

    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
    }

    const stopTimer = window.setTimeout(() => {
      wantStopRef.current = true;
      if (reducedMotion) {
        waitForResult();
      }
    }, stopAt);

    const fallbackTimer = window.setTimeout(() => {
      if (phaseRef.current !== "decel") return;
      finishStop();
    }, stopAt + (reducedMotion ? 50 : anim.decelMs + 120));

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(stopTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [
    spinning,
    stopGeneration,
    columnIndex,
    anim,
    cellH,
    allSymbolIds,
    reducedMotion,
    finishStop,
  ]);

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.propertyName !== "transform" || phaseRef.current !== "decel") return;
      finishStop();
    },
    [finishStop]
  );

  const lastIndex = strip.length - VISIBLE_ROWS;
  const isMotion = phase === "accel" || phase === "spin";
  const isDecel = phase === "decel";

  return (
    <div
      className={cn(
        "slot-reel-col",
        isMotion && "slot-reel-col--spinning",
        isDecel && "slot-reel-col--stopping"
      )}
    >
      <div className="slot-reel-drum">
        <div className="slot-reel-lip slot-reel-lip--top" aria-hidden />
        <div className="slot-reel-window">
          <div
            ref={stripRef}
            className={cn(
              "slot-reel-strip",
              isMotion && "slot-reel-strip--motion",
              isDecel && "slot-reel-strip--decel"
            )}
            style={{ transform: `translate3d(0, -${offset}px, 0)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {strip.map((symId, i) => {
              const visibleRow = i - lastIndex;
              const showWin =
                highlight &&
                phase === "idle" &&
                visibleRow >= 0 &&
                visibleRow < VISIBLE_ROWS &&
                winRows.has(visibleRow);
              const showScatter =
                highlight &&
                phase === "idle" &&
                visibleRow >= 0 &&
                visibleRow < VISIBLE_ROWS &&
                scatterRows.has(visibleRow);
              return (
                <ReelCell
                  key={`${stopGeneration}-${columnIndex}-${i}`}
                  symId={symId}
                  gameId={gameId}
                  isWin={showWin}
                  isScatter={showScatter}
                  stripIndex={i}
                  offset={offset}
                  cellH={cellH}
                  visibleRow={visibleRow}
                  isMotion={isMotion}
                  settling={
                    settling && visibleRow >= 0 && visibleRow < VISIBLE_ROWS
                  }
                />
              );
            })}
          </div>
        </div>
        <div className="slot-reel-lip slot-reel-lip--bottom" aria-hidden />
      </div>
    </div>
  );
}

function SlotReelsInner({
  gameId,
  grid,
  spinning,
  stopGeneration,
  resultReady = false,
  winningCells = [],
  scatterCells = [],
  highlight = false,
  onAllStopped,
}: {
  gameId: SlotGameId;
  grid: string[][];
  spinning: boolean;
  stopGeneration: number;
  resultReady?: boolean;
  winningCells?: WinCell[];
  scatterCells?: WinCell[];
  highlight?: boolean;
  onAllStopped?: () => void;
}) {
  const game = getSlotGame(gameId)!;
  const allIds = useMemo(() => Object.keys(game.symbols), [game.symbols]);
  const stoppedCount = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  const winByCol = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const c of winningCells) {
      if (!map.has(c.col)) map.set(c.col, new Set());
      map.get(c.col)!.add(c.row);
    }
    return map;
  }, [winningCells]);

  const scatterByCol = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const c of scatterCells) {
      if (!map.has(c.col)) map.set(c.col, new Set());
      map.get(c.col)!.add(c.row);
    }
    return map;
  }, [scatterCells]);

  const handleStopped = useCallback(() => {
    stoppedCount.current += 1;
    if (stoppedCount.current >= 5) {
      stoppedCount.current = 0;
      onAllStopped?.();
    }
  }, [onAllStopped]);

  useEffect(() => {
    if (spinning) stoppedCount.current = 0;
  }, [spinning, stopGeneration]);

  return (
    <div className={cn("slot-reels", `slot-reels--${gameId}`)}>
      {grid.map((col, colIndex) => (
        <SlotReelColumn
          key={colIndex}
          columnIndex={colIndex}
          finalSymbols={[col[0], col[1], col[2]]}
          gameId={gameId}
          allSymbolIds={allIds}
          spinning={spinning}
          stopGeneration={stopGeneration}
          resultReady={resultReady}
          winRows={winByCol.get(colIndex) ?? EMPTY_SET}
          scatterRows={scatterByCol.get(colIndex) ?? EMPTY_SET}
          highlight={highlight}
          reducedMotion={reducedMotion}
          onStopped={handleStopped}
        />
      ))}
    </div>
  );
}

export function SlotReels(
  props: Parameters<typeof SlotReelsInner>[0]
) {
  return (
    <ReelMetricsProvider>
      <SlotReelsInner {...props} />
    </ReelMetricsProvider>
  );
}

const EMPTY_SET = new Set<number>();
