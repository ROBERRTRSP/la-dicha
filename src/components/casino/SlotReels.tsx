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
import {
  VISIBLE_ROWS,
  buildStrip,
  computeDecelOffsets,
  drumCellOpacity,
  drumCellTransform,
  finalOffset,
  interpolateDecelOffset,
  loopHeightPx,
  settleBounceOffset,
  SETTLE_BOUNCE_MS,
  type ReelPhase,
} from "@/lib/slots/reel-motion";
import { cn } from "@/lib/utils";

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
  liteMotion,
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
  liteMotion?: boolean;
}) {
  const wheelStyle =
    isMotion && !liteMotion
      ? drumCellTransform(
          stripIndex,
          offset,
          cellH,
          isMotion,
          visibleRow
        )
      : undefined;
  const motionOpacity =
    isMotion && !liteMotion
      ? drumCellOpacity(stripIndex, offset, cellH, isMotion)
      : undefined;

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
    buildStrip(finalSymbols, allSymbolIds, anim.loopRepeats, Math.random)
  );
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [settling, setSettling] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const stripDataRef = useRef(strip);
  const cellHRef = useRef(cellH);
  const phaseRef = useRef<ReelPhase>("idle");
  const offsetRef = useRef(0);
  const totalOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef(0);
  const decelRafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const accelStartRef = useRef(0);
  const stoppedRef = useRef(false);
  const decelStartedRef = useRef(false);
  const targetOffsetRef = useRef(0);
  const mountedRef = useRef(false);
  const finalsRef = useRef(finalSymbols);
  const wantStopRef = useRef(false);
  const resultReadyRef = useRef(false);
  const visualSyncRef = useRef(0);
  const decelFinishTimerRef = useRef(0);
  const beginDecelRef = useRef<(() => void) | null>(null);
  const animRef = useRef(anim);
  const reducedMotionRef = useRef(reducedMotion);
  const allSymbolIdsRef = useRef(allSymbolIds);
  const isMobileRef = useRef(isMobile);
  const finishStopRef = useRef<() => void>(() => {});

  cellHRef.current = cellH;
  stripDataRef.current = strip;
  animRef.current = anim;
  reducedMotionRef.current = reducedMotion;
  allSymbolIdsRef.current = allSymbolIds;
  isMobileRef.current = isMobile;

  useEffect(() => {
    resultReadyRef.current = resultReady ?? false;
    if (
      resultReadyRef.current &&
      wantStopRef.current &&
      !decelStartedRef.current &&
      beginDecelRef.current
    ) {
      beginDecelRef.current();
    }
  }, [resultReady]);

  useEffect(() => {
    finalsRef.current = finalSymbols;
  }, [finalSymbols]);

  const finishStop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    cancelAnimationFrame(decelRafRef.current);
    window.clearTimeout(decelFinishTimerRef.current);
    if (stripRef.current) {
      stripRef.current.style.transition = "";
      stripRef.current.style.transform = `translate3d(0, -${offsetRef.current}px, 0)`;
    }
    setSettling(true);
    window.setTimeout(() => {
      setSettling(false);
      phaseRef.current = "idle";
      setPhase("idle");
      onStopped?.();
    }, animRef.current.settleMs);
  }, [onStopped]);

  finishStopRef.current = finishStop;

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const s = buildStrip(finalSymbols, allSymbolIds, anim.loopRepeats, Math.random);
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
    const wasActive = !stoppedRef.current;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(decelRafRef.current);
    window.clearTimeout(decelFinishTimerRef.current);
    wantStopRef.current = false;
    decelStartedRef.current = false;
    setSettling(false);
    phaseRef.current = "idle";
    setPhase("idle");
    beginDecelRef.current = null;
    if (stripRef.current) {
      stripRef.current.style.transition = "";
    }
    if (cellH > 0) {
      const fo = finalOffset(strip.length, cellH);
      offsetRef.current = fo;
      setOffset(fo);
      if (stripRef.current) {
        stripRef.current.style.transform = `translate3d(0, -${fo}px, 0)`;
      }
    }
    if (wasActive) {
      stoppedRef.current = true;
      onStopped?.();
    }
  }, [spinning, strip.length, cellH, onStopped]);

  useEffect(() => {
    if (!spinning) return;

    stoppedRef.current = false;
    wantStopRef.current = false;
    decelStartedRef.current = false;
    visualSyncRef.current = 0;
    setSettling(false);

    const animNow = animRef.current;
    const reduced = reducedMotionRef.current;
    const symbolIds = allSymbolIdsRef.current;
    const cellHNow = cellHRef.current;
    const startFinals = finalsRef.current;
    const newStrip = buildStrip(
      startFinals,
      symbolIds,
      animNow.loopRepeats,
      Math.random
    );
    targetOffsetRef.current = finalOffset(newStrip.length, cellHNow);
    stripDataRef.current = newStrip;

    setStrip(newStrip);
    offsetRef.current = 0;
    totalOffsetRef.current = 0;
    setOffset(0);
    phaseRef.current = "accel";
    setPhase("accel");
    velocityRef.current = 0;
    accelStartRef.current = performance.now();
    lastFrameRef.current = accelStartRef.current;

    if (stripRef.current) {
      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = "translate3d(0, 0, 0)";
    }

    const stopAt = reduced
      ? 80 + columnIndex * 40
      : animNow.baseSpinMs + columnIndex * animNow.columnStopDelayMs;

    const runSettleBounce = (
      el: HTMLElement,
      finalSnap: number,
      h: number,
      onDone: () => void
    ) => {
      if (reducedMotionRef.current) {
        el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
        offsetRef.current = finalSnap;
        setOffset(finalSnap);
        onDone();
        return;
      }

      const bounceStart = performance.now();
      el.style.transition = "none";

      const bounceTick = (now: number) => {
        if (phaseRef.current !== "decel") return;
        const progress =
          SETTLE_BOUNCE_MS > 0 ? (now - bounceStart) / SETTLE_BOUNCE_MS : 1;
        const y = settleBounceOffset(finalSnap, h, progress);
        el.style.transform = `translate3d(0, -${y}px, 0)`;

        if (progress < 1) {
          decelRafRef.current = requestAnimationFrame(bounceTick);
          return;
        }

        el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
        offsetRef.current = finalSnap;
        setOffset(finalSnap);
        onDone();
      };

      decelRafRef.current = requestAnimationFrame(bounceTick);
    };

    const runDecelRaf = (
      el: HTMLElement,
      startOffset: number,
      snapOffset: number,
      finalSnap: number,
      decelMs: number
    ) => {
      const decelStart = performance.now();
      el.style.transition = "none";

      const decelTick = (now: number) => {
        if (phaseRef.current !== "decel") return;
        const progress = decelMs > 0 ? (now - decelStart) / decelMs : 1;
        const current = interpolateDecelOffset(startOffset, snapOffset, progress);
        el.style.transform = `translate3d(0, -${current}px, 0)`;

        if (progress < 1) {
          decelRafRef.current = requestAnimationFrame(decelTick);
          return;
        }

        runSettleBounce(el, finalSnap, cellHRef.current, () => {
          finishStopRef.current();
        });
      };

      decelRafRef.current = requestAnimationFrame(decelTick);
    };

    const beginDecel = () => {
      if (decelStartedRef.current) return;
      decelStartedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(decelRafRef.current);
      window.clearTimeout(decelFinishTimerRef.current);

      const latestFinals = finalsRef.current;
      const prev = stripDataRef.current;
      const tail = prev.slice(-VISIBLE_ROWS).join(",");
      const nextTail = latestFinals.join(",");
      const nextStrip =
        tail === nextTail
          ? prev
          : [...prev.slice(0, -VISIBLE_ROWS), ...latestFinals];

      const h = cellHRef.current;
      const finalSnap = finalOffset(nextStrip.length, h);
      targetOffsetRef.current = finalSnap;
      stripDataRef.current = nextStrip;
      setStrip(nextStrip);

      phaseRef.current = "decel";
      setPhase("decel");

      const { startOffset, snapOffset } = computeDecelOffsets(
        totalOffsetRef.current,
        nextStrip.length,
        h
      );
      const animLive = animRef.current;
      const decelMs = reducedMotionRef.current ? 0 : animLive.decelMs;
      const useRafDecel = isMobileRef.current || reducedMotionRef.current;
      totalOffsetRef.current = finalSnap;

      const applyDecel = () => {
        const el = stripRef.current;
        if (!el) {
          offsetRef.current = finalSnap;
          setOffset(finalSnap);
          finishStopRef.current();
          return;
        }

        el.style.transition = "none";
        el.style.transform = `translate3d(0, -${startOffset}px, 0)`;

        if (decelMs > 0 && Math.abs(startOffset - snapOffset) >= 1) {
          if (useRafDecel) {
            runDecelRaf(el, startOffset, snapOffset, finalSnap, decelMs);
            decelFinishTimerRef.current = window.setTimeout(() => {
              if (phaseRef.current === "decel") {
                el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
                offsetRef.current = finalSnap;
                setOffset(finalSnap);
                finishStopRef.current();
              }
            }, decelMs + SETTLE_BOUNCE_MS + 150);
          } else {
            void el.offsetHeight;
            el.style.transition = `transform ${decelMs}ms ${animLive.decelEasing}`;
            el.style.transform = `translate3d(0, -${snapOffset}px, 0)`;
            decelFinishTimerRef.current = window.setTimeout(() => {
              if (phaseRef.current === "decel") {
                el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
                offsetRef.current = finalSnap;
                setOffset(finalSnap);
                finishStopRef.current();
              }
            }, decelMs + SETTLE_BOUNCE_MS + 150);
          }
        } else {
          el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
          offsetRef.current = finalSnap;
          setOffset(finalSnap);
          finishStopRef.current();
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(applyDecel);
      });
    };

    beginDecelRef.current = beginDecel;

    const tick = (now: number) => {
      const dt = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (phaseRef.current === "decel") return;

      const animLive = animRef.current;
      const reducedLive = reducedMotionRef.current;
      const loopH = loopHeightPx(cellHRef.current);

      if (!reducedLive) {
        if (phaseRef.current === "accel") {
          const elapsed = now - accelStartRef.current;
          const t = Math.min(1, elapsed / animLive.accelMs);
          velocityRef.current = animLive.maxVelocity * t * t;
        } else if (phaseRef.current === "spin") {
          velocityRef.current = animLive.maxVelocity;
        }
      } else {
        velocityRef.current = 0;
        if (phaseRef.current === "accel") {
          phaseRef.current = "spin";
          setPhase("spin");
        }
      }

      if (phaseRef.current === "accel" || phaseRef.current === "spin") {
        if (!reducedLive) {
          totalOffsetRef.current += velocityRef.current * dt;
          const display =
            loopH > 0 ? totalOffsetRef.current % loopH : totalOffsetRef.current;
          offsetRef.current = display;

          if (stripRef.current) {
            stripRef.current.style.transform = `translate3d(0, -${display}px, 0)`;
          }
          if (now - visualSyncRef.current >= 48) {
            visualSyncRef.current = now;
            setOffset(display);
          }
        }

        if (
          !reducedLive &&
          phaseRef.current === "accel" &&
          now - accelStartRef.current >= animLive.accelMs
        ) {
          phaseRef.current = "spin";
          setPhase("spin");
        }

        if (now >= stopAt) {
          wantStopRef.current = true;
        }

        if (wantStopRef.current && resultReadyRef.current) {
          beginDecel();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    const stopTimer = window.setTimeout(() => {
      wantStopRef.current = true;
      if (resultReadyRef.current) {
        beginDecel();
      }
    }, stopAt);

    const fallbackTimer = window.setTimeout(() => {
      if (phaseRef.current !== "decel") return;
      finishStopRef.current();
    }, stopAt + (reduced ? 80 : animNow.decelMs + 200));

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (phaseRef.current === "decel" && decelStartedRef.current) {
        finishStopRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      beginDecelRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(decelRafRef.current);
      window.clearTimeout(stopTimer);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(decelFinishTimerRef.current);
    };
  }, [spinning, stopGeneration, columnIndex]);

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.propertyName !== "transform" || phaseRef.current !== "decel") return;
      const el = stripRef.current;
      const finalSnap = targetOffsetRef.current;
      if (!el) {
        finishStop();
        return;
      }

      if (reducedMotionRef.current) {
        el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
        offsetRef.current = finalSnap;
        setOffset(finalSnap);
        finishStop();
        return;
      }

      el.style.transition = "none";
      const bounceStart = performance.now();
      const h = cellHRef.current;

      const bounceTick = (now: number) => {
        if (phaseRef.current !== "decel") return;
        const progress =
          SETTLE_BOUNCE_MS > 0 ? (now - bounceStart) / SETTLE_BOUNCE_MS : 1;
        const y = settleBounceOffset(finalSnap, h, progress);
        el.style.transform = `translate3d(0, -${y}px, 0)`;
        if (progress < 1) {
          decelRafRef.current = requestAnimationFrame(bounceTick);
          return;
        }
        el.style.transform = `translate3d(0, -${finalSnap}px, 0)`;
        offsetRef.current = finalSnap;
        setOffset(finalSnap);
        finishStop();
      };

      decelRafRef.current = requestAnimationFrame(bounceTick);
    },
    [finishStop]
  );

  const lastIndex = strip.length - VISIBLE_ROWS;
  const isMotion = phase === "accel" || phase === "spin";
  const isDecel = phase === "decel";
  const isIdle = phase === "idle";

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
        <div
          className={cn(
            "slot-reel-window",
            isMotion && "slot-reel-window--motion"
          )}
        >
          <div
            ref={stripRef}
            className={cn(
              "slot-reel-strip",
              isMotion && "slot-reel-strip--motion",
              isDecel && "slot-reel-strip--decel"
            )}
            style={
              isIdle
                ? { transform: `translate3d(0, -${offset}px, 0)` }
                : undefined
            }
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
                  liteMotion={isMobile}
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
