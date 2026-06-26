import { getSlotAnimationConfig, type SlotAnimConfig } from "./animation-config";
import type { SlotGameId } from "./types";

export const VISIBLE_ROWS = 3;
export const LOOP_SEGMENT_SIZE = 12;
export const REEL_COLUMN_COUNT = 5;
export const MOBILE_MAX_WIDTH = 768;

export type ReelPhase = "idle" | "accel" | "spin" | "decel";

export function loopHeightPx(cellH: number): number {
  return LOOP_SEGMENT_SIZE * cellH;
}

export function finalOffset(stripLen: number, cellH: number): number {
  return Math.max(0, (stripLen - VISIBLE_ROWS) * cellH);
}

export function drumCellTransform(
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

export function drumCellOpacity(
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

export function buildLoopSegment(allIds: string[], rng: () => number): string[] {
  return Array.from(
    { length: LOOP_SEGMENT_SIZE },
    () => allIds[Math.floor(rng() * allIds.length)] ?? allIds[0]
  );
}

export function buildStrip(
  finalCol: string[],
  allIds: string[],
  repeatCount: number,
  rng: () => number
): string[] {
  const segment = buildLoopSegment(allIds, rng);
  const body: string[] = [];
  for (let i = 0; i < repeatCount; i++) {
    body.push(...segment);
  }
  return [...body, ...finalCol];
}

export function visibleSymbolsAtOffset(
  strip: string[],
  offset: number,
  cellH: number
): string[] {
  if (cellH <= 0) return [];
  const lastIndex = Math.max(0, strip.length - VISIBLE_ROWS);
  const startIndex = Math.min(
    Math.max(0, Math.floor(offset / cellH + 1e-6)),
    lastIndex
  );
  return strip.slice(startIndex, startIndex + VISIBLE_ROWS);
}

/** Posiciones de deceleración: evita retroceso y aterrizaje congelado. */
export function computeDecelOffsets(
  totalOffset: number,
  stripLen: number,
  cellH: number
): { startOffset: number; snapOffset: number } {
  const loopH = loopHeightPx(cellH);
  const snapOffset = finalOffset(stripLen, cellH);
  const startOffset = loopH > 0 ? totalOffset % loopH : totalOffset;

  if (Math.abs(startOffset - snapOffset) < 1) {
    return { startOffset: snapOffset, snapOffset };
  }

  let targetOffset = snapOffset;
  if (targetOffset < startOffset) {
    targetOffset += loopH;
  }

  return { startOffset, snapOffset: targetOffset };
}

/** Curva ease-out para deceleración en rAF (Safari iOS). */
export function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Curva con ligero overshoot — sensación de freno mecánico al parar. */
export function easeOutBack(t: number, overshoot = 1.15): number {
  const c = Math.max(0, Math.min(1, t));
  const inv = c - 1;
  return 1 + inv * inv * ((overshoot + 1) * inv + overshoot);
}

export function interpolateDecelOffset(
  start: number,
  end: number,
  progress: number
): number {
  const t = Math.max(0, Math.min(1, progress));
  const eased =
    t < 0.92
      ? easeOutCubic(t / 0.92) * 0.92
      : 0.92 + easeOutBack((t - 0.92) / 0.08, 0.9) * 0.08;
  return start + (end - start) * eased;
}

/** Rebote final del strip tras la deceleración (px desde arriba). */
export function settleBounceOffset(
  finalOffsetPx: number,
  cellHeight: number,
  progress: number
): number {
  const t = Math.max(0, Math.min(1, progress));
  const overshoot = Math.sin(t * Math.PI) * cellHeight * 0.06 * (1 - t * 0.55);
  return finalOffsetPx - overshoot;
}

export const SETTLE_BOUNCE_MS = 260;

export function computeReelMetrics(viewportWidth: number, stageHeight = 0) {
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
    windowHeight: cellHeight * VISIBLE_ROWS,
    viewportWidth,
    isMobile: viewportWidth <= MOBILE_MAX_WIDTH,
  };
}

export function columnStopAtMs(
  anim: SlotAnimConfig,
  columnIndex: number,
  reducedMotion: boolean
): number {
  return reducedMotion
    ? 80 + columnIndex * 40
    : anim.baseSpinMs + columnIndex * anim.columnStopDelayMs;
}

/** Sincronización padre: premio solo cuando carretes + API listos. */
export function canFinalizeSpin(
  reelsStopped: boolean,
  apiResolved: boolean,
  hasPendingResult: boolean
): boolean {
  return reelsStopped && apiResolved && hasPendingResult;
}

export type ReelSimSnapshot = {
  phase: ReelPhase;
  offset: number;
  velocity: number;
  stopped: boolean;
  visible: string[];
};

export type ReelSimOptions = {
  columnIndex: number;
  finalSymbols: string[];
  allSymbolIds: string[];
  gameId: SlotGameId;
  cellHeight: number;
  mobile?: boolean;
  reducedMotion?: boolean;
  rng?: () => number;
};

/** Simula un carrete sin DOM — misma lógica que SlotReelColumn. */
export class ReelMotionSimulator {
  readonly columnIndex: number;
  readonly anim: SlotAnimConfig;
  readonly cellH: number;
  readonly reducedMotion: boolean;
  readonly allSymbolIds: string[];
  readonly rng: () => number;

  phase: ReelPhase = "idle";
  strip: string[] = [];
  offset = 0;
  totalOffset = 0;
  velocity = 0;
  targetOffset = 0;
  stopped = true;
  settling = false;
  wantStop = false;
  resultReady = false;
  decelStarted = false;

  private accelStart = 0;
  private decelStart = 0;
  private lastFrame = 0;
  private stopAt = 0;
  private finals: string[];

  constructor(opts: ReelSimOptions) {
    this.columnIndex = opts.columnIndex;
    this.cellH = opts.cellHeight;
    this.reducedMotion = opts.reducedMotion ?? false;
    this.allSymbolIds = opts.allSymbolIds;
    this.rng = opts.rng ?? Math.random;
    this.finals = [...opts.finalSymbols];
    this.anim = getSlotAnimationConfig(opts.gameId, {
      mobile: opts.mobile,
      cellHeight: opts.cellHeight,
    });
    this.strip = buildStrip(
      this.finals,
      this.allSymbolIds,
      this.anim.loopRepeats,
      this.rng
    );
    this.offset = finalOffset(this.strip.length, this.cellH);
    this.totalOffset = this.offset;
    this.targetOffset = this.offset;
    this.stopAt = columnStopAtMs(this.anim, this.columnIndex, this.reducedMotion);
  }

  startSpin(): void {
    this.stopped = false;
    this.wantStop = false;
    this.resultReady = false;
    this.decelStarted = false;
    this.settling = false;
    this.strip = buildStrip(
      this.finals,
      this.allSymbolIds,
      this.anim.loopRepeats,
      this.rng
    );
    this.targetOffset = finalOffset(this.strip.length, this.cellH);
    this.offset = 0;
    this.totalOffset = 0;
    this.velocity = 0;
    this.phase = this.reducedMotion ? "spin" : "accel";
    this.accelStart = 0;
    this.lastFrame = 0;
    this.stopAt = columnStopAtMs(this.anim, this.columnIndex, this.reducedMotion);
  }

  setFinalSymbols(symbols: string[]): void {
    this.finals = [...symbols];
  }

  markResultReady(): void {
    this.resultReady = true;
  }

  /** Avanza un frame; devuelve true si el carrete sigue activo. */
  tick(now: number): boolean {
    if (this.phase === "idle") return false;

    if (this.phase === "decel") {
      const decelMs = this.reducedMotion ? 0 : this.anim.decelMs;
      if (decelMs === 0 || now - this.decelStart >= decelMs) {
        this.offset = this.targetOffset;
        this.finishStop();
      }
      return !this.stopped;
    }

    if (this.lastFrame === 0) {
      this.accelStart = now;
      this.lastFrame = now;
    }

    const dt = Math.min(32, now - this.lastFrame);
    this.lastFrame = now;

    if (this.phase === "accel") {
      const elapsed = now - this.accelStart;
      const t = Math.min(1, elapsed / this.anim.accelMs);
      this.velocity = this.anim.maxVelocity * t * t;
      if (elapsed >= this.anim.accelMs) {
        this.phase = "spin";
      }
    } else if (this.phase === "spin") {
      this.velocity = this.reducedMotion ? 0 : this.anim.maxVelocity;
    }

    if (this.phase === "accel" || this.phase === "spin") {
      this.totalOffset += this.velocity * dt;
      const loopH = loopHeightPx(this.cellH);
      this.offset =
        loopH > 0 ? this.totalOffset % loopH : this.totalOffset;

      if (now >= this.stopAt) {
        this.wantStop = true;
      }

      if (this.wantStop && this.resultReady) {
        this.beginDecel();
      }
    }

    return !this.stopped;
  }

  /** Parada forzada cuando spinning=false en el padre. */
  forceIdle(): void {
    if (this.phase === "idle") return;
    const wasActive = !this.stopped;
    this.wantStop = false;
    this.settling = false;
    this.phase = "idle";
    const fo = finalOffset(this.strip.length, this.cellH);
    this.offset = fo;
    this.totalOffset = fo;
    this.targetOffset = fo;
    this.stopped = true;
    if (wasActive) {
      /* onStopped */
    }
  }

  private beginDecel(): void {
    if (this.decelStarted) return;
    this.decelStarted = true;

    const tail = this.strip.slice(-VISIBLE_ROWS).join(",");
    const nextTail = this.finals.join(",");
    if (tail !== nextTail) {
      this.strip = [...this.strip.slice(0, -VISIBLE_ROWS), ...this.finals];
    }
    this.targetOffset = finalOffset(this.strip.length, this.cellH);
    const { startOffset } = computeDecelOffsets(
      this.totalOffset,
      this.strip.length,
      this.cellH
    );
    this.phase = "decel";
    this.offset = startOffset;
    this.decelStart = this.lastFrame || 0;

    const decelMs = this.reducedMotion ? 0 : this.anim.decelMs;
    if (decelMs === 0 || Math.abs(startOffset - this.targetOffset) < 1) {
      this.offset = this.targetOffset;
      this.finishStop();
    }
  }

  private finishStop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.settling = true;
    this.phase = "idle";
    this.settling = false;
    this.offset = this.targetOffset;
  }

  snapshot(): ReelSimSnapshot {
    return {
      phase: this.phase,
      offset: this.offset,
      velocity: this.velocity,
      stopped: this.stopped,
      visible: visibleSymbolsAtOffset(this.strip, this.offset, this.cellH),
    };
  }
}

export type MachineSimResult = {
  columns: ReelSimSnapshot[];
  allStopped: boolean;
  maxDurationMs: number;
  finalized: boolean;
};

/** Simula los 5 carretes con API tardía o temprana. */
export function simulateMachineSpin(opts: {
  gameId: SlotGameId;
  grid: string[][];
  allSymbolIds: string[];
  cellHeight: number;
  mobile?: boolean;
  reducedMotion?: boolean;
  apiDelayMs?: number;
  rng?: () => number;
  maxSimMs?: number;
}): MachineSimResult {
  const {
    gameId,
    grid,
    allSymbolIds,
    cellHeight,
    mobile = true,
    reducedMotion = false,
    apiDelayMs = 200,
    rng = Math.random,
    maxSimMs = 15000,
  } = opts;

  const reels = grid.map((col, columnIndex) => {
    const sim = new ReelMotionSimulator({
      columnIndex,
      finalSymbols: col,
      allSymbolIds,
      gameId,
      cellHeight,
      mobile,
      reducedMotion,
      rng,
    });
    sim.startSpin();
    return sim;
  });

  let apiReady = false;
  const apiReadyAt = apiDelayMs;
  let t = 0;
  const dt = 16;

  while (t <= maxSimMs) {
    if (!apiReady && t >= apiReadyAt) {
      apiReady = true;
      for (const reel of reels) reel.markResultReady();
    }

    let anyActive = false;
    for (const reel of reels) {
      if (reel.tick(t)) anyActive = true;
    }

    const allStopped = reels.every((r) => r.stopped);
    if (allStopped && apiReady) {
      return {
        columns: reels.map((r) => r.snapshot()),
        allStopped: true,
        maxDurationMs: t,
        finalized: true,
      };
    }

    if (!anyActive && allStopped) break;
    t += dt;
  }

  return {
    columns: reels.map((r) => r.snapshot()),
    allStopped: reels.every((r) => r.stopped),
    maxDurationMs: t,
    finalized: apiReady && reels.every((r) => r.stopped),
  };
}
