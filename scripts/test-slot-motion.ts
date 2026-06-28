/**
 * Test de movimiento completo de la slot machine (5 carretes).
 * Simula aceleración, giro, deceleración, parada escalonada y sync API.
 *
 * Ejecutar: npm run test:slot-motion
 */
import {
  VISIBLE_ROWS,
  buildStrip,
  canFinalizeSpin,
  cellInViewport,
  columnStopAtMs,
  computeDecelOffsets,
  computeReelMetrics,
  drumCellOpacity,
  drumCellTransform,
  easeOutCubic,
  easeOutBack,
  finalOffset,
  interpolateDecelOffset,
  loopHeightPx,
  settleBounceOffset,
  SETTLE_BOUNCE_MS,
  ReelMotionSimulator,
  simulateMachineSpin,
  visibleSymbolsAtOffset,
  REEL_COLUMN_COUNT,
} from "../src/lib/slots/reel-motion";
import {
  estimateMaxSpinDurationMs,
  getSlotAnimationConfig,
} from "../src/lib/slots/animation-config";
import { getSlotGame } from "../src/lib/slots/games";
import type { SlotGameId } from "../src/lib/slots/types";

let passed = 0;
let failed = 0;

function ok(msg: string) {
  passed++;
  console.log(`  ✓ ${msg}`);
}

function fail(msg: string) {
  failed++;
  console.log(`  ✗ ${msg}`);
}

function assert(cond: boolean, msg: string) {
  if (cond) ok(msg);
  else fail(msg);
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual === expected) ok(msg);
  else fail(`${msg} (esperado ${expected}, obtuvo ${actual})`);
}

const GAME_IDS: SlotGameId[] = [
  "moon-wolf",
  "treasure-skunk",
  "magic-lamp",
  "golden-ox",
  "classic-7",
];

const SYMBOLS = ["a", "k", "q", "j", "wild", "scatter"];
const seededRng = (() => {
  let s = 42;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
})();

console.log("\n=== 1. Matemática de offset y bucle ===");
assertEq(finalOffset(99, 72), (99 - 3) * 72, "finalOffset alinea últimas 3 filas");
assertEq(loopHeightPx(72), 12 * 72, "loopHeight = 12 celdas");
{
  const strip = buildStrip(["a", "k", "q"], SYMBOLS, 4, seededRng);
  const fo = finalOffset(strip.length, 68);
  const visible = visibleSymbolsAtOffset(strip, fo, 68);
  assert(
    visible.join(",") === "a,k,q",
    "visibleSymbolsAtOffset muestra rejilla final"
  );
}

console.log("\n=== 2b. Deceleración y snap final ===");
{
  assert(easeOutCubic(0) === 0 && easeOutCubic(1) === 1, "easeOutCubic extremos");
  assert(easeOutBack(1) === 1, "easeOutBack termina en 1");
  const mid = interpolateDecelOffset(0, 100, 0.5);
  assert(mid > 88 && mid < 100, "interpolateDecelOffset expo-out acelera al final");
  const bounceStart = settleBounceOffset(500, 72, 0);
  const bounceMid = settleBounceOffset(500, 72, 0.5);
  assert(bounceStart === 500, "snap inicia en offset final");
  assert(bounceMid <= 500 && bounceMid >= 499, "snap mínimo sin rebote mecánico");
  assertEq(SETTLE_BOUNCE_MS, 60, "SETTLE_BOUNCE_MS constante");
}

console.log("\n=== 2. Video slot plano (sin tambor 3D en giro) ===");
{
  const motion = drumCellTransform(2, 120, 68, true, 1);
  assert(motion === undefined, "sin perspectiva 3D durante giro");
  const idle = drumCellTransform(97, 5000, 68, false, 1);
  assert(
    idle === undefined || idle.startsWith("scale"),
    "idle sin tambor mecánico"
  );
  assert(cellInViewport(2, 120, 68), "cellInViewport detecta celda visible");
  assert(!cellInViewport(99, 120, 68), "cellInViewport excluye celda lejana");
  assert(drumCellOpacity(2, 120, 68, true) === undefined, "sin fade en giro");
  assertEq(drumCellOpacity(74, 5000, 68, false), 1, "opacidad plena en reposo");
}

console.log("\n=== 3. Métricas responsive (más espacio a rodillos) ===");
{
  const narrow = computeReelMetrics(360, 0);
  assert(narrow.cellHeight >= 58 && narrow.cellHeight <= 102, "cellHeight acotado 58–102");
  assertEq(narrow.windowHeight, narrow.cellHeight * VISIBLE_ROWS, "windowHeight = 3 filas");

  const tall = computeReelMetrics(360, 320);
  assert(
    tall.cellHeight >= narrow.cellHeight,
    "stage alto aumenta cellHeight vs solo ancho"
  );
}

console.log("\n=== 3b. Ritmo móvil: más lento y legible que desktop ===");
for (const gameId of GAME_IDS) {
  const desktop = getSlotAnimationConfig(gameId, { mobile: false, cellHeight: 72 });
  const mobile = getSlotAnimationConfig(gameId, { mobile: true, cellHeight: 72 });
  assert(
    mobile.maxVelocity < desktop.maxVelocity,
    `${gameId}: móvil más lento (velocity ${mobile.maxVelocity.toFixed(2)} < ${desktop.maxVelocity.toFixed(2)})`
  );
  assert(
    mobile.baseSpinMs >= desktop.baseSpinMs,
    `${gameId}: móvil baseSpinMs ≥ desktop (${mobile.baseSpinMs} ≥ ${desktop.baseSpinMs})`
  );
  assert(
    estimateMaxSpinDurationMs(mobile) > estimateMaxSpinDurationMs(desktop),
    `${gameId}: ciclo móvil más largo (${estimateMaxSpinDurationMs(mobile)}ms > ${estimateMaxSpinDurationMs(desktop)}ms)`
  );
}

console.log("\n=== 4. Parada escalonada por columna (5 rodillos) ===");
for (const gameId of GAME_IDS) {
  const anim = getSlotAnimationConfig(gameId, { mobile: true, cellHeight: 72 });
  const stops = Array.from({ length: REEL_COLUMN_COUNT }, (_, i) =>
    columnStopAtMs(anim, i, false, true)
  );
  const strictlyIncreasing = stops.every(
    (ms, i) => i === 0 || ms > stops[i - 1]
  );
  assert(
    strictlyIncreasing,
    `${gameId}: stopAt crece por columna (${stops.join("→")}ms)`
  );
}

console.log("\n=== 5. Simulación carrete único: accel → spin → decel → idle ===");
{
  const sim = new ReelMotionSimulator({
    columnIndex: 0,
    finalSymbols: ["wild", "a", "k"],
    allSymbolIds: SYMBOLS,
    gameId: "moon-wolf",
    cellHeight: 72,
    mobile: true,
    rng: seededRng,
  });
  sim.startSpin();
  assert(sim.phase === "accel", "inicia en accel");
  sim.markResultReady();
  let t = 0;
  let sawSpin = false;
  let sawDecel = false;
  while (t < 8000) {
    const active = sim.tick(t);
    if (sim.phase === "spin") sawSpin = true;
    if (sim.phase === "decel") sawDecel = true;
    if (!active && sim.stopped) break;
    t += 16;
  }

  assert(sawSpin, "carrete pasa por fase spin");
  assert(sawDecel, "carrete pasa por fase decel");
  assert(sim.stopped, "carrete termina detenido");
  assertEq(sim.phase, "idle", "carrete vuelve a idle");

  const visible = sim.snapshot().visible;
  assert(
    visible.join(",") === "wild,a,k",
    `aterriza en símbolos finales (${visible.join(",")})`
  );
}

console.log("\n=== 6. Simulación máquina completa (5 carretes) ===");
for (const gameId of GAME_IDS) {
  const game = getSlotGame(gameId)!;
  const ids = Object.keys(game.symbols);
  const grid = Array.from({ length: 5 }, (_, c) =>
    Array.from({ length: 3 }, (_, r) => ids[(c + r) % ids.length])
  );

  const result = simulateMachineSpin({
    gameId,
    grid,
    allSymbolIds: ids,
    cellHeight: 72,
    mobile: true,
    apiDelayMs: 300,
    rng: seededRng,
  });

  assert(result.finalized, `${gameId}: 5 carretes + API finalizan`);
  assert(result.allStopped, `${gameId}: todos los carretes stopped`);
  assert(
    result.columns.length === 5,
    `${gameId}: snapshot de 5 columnas`
  );
  assert(
    result.maxDurationMs < 14000,
    `${gameId}: ciclo completo < 14s (${result.maxDurationMs}ms)`
  );

  const animMobile = getSlotAnimationConfig(gameId, {
    mobile: true,
    cellHeight: 72,
  });
  const targetMs = estimateMaxSpinDurationMs(animMobile);
  assert(
    targetMs >= 3000 && targetMs <= 3400,
    `${gameId}: duración objetivo móvil ~3.2s (${targetMs}ms)`
  );
  assert(
    result.maxDurationMs >= 2800 && result.maxDurationMs <= 4000,
    `${gameId}: simulación móvil ~3.2s (${result.maxDurationMs}ms)`
  );

  for (let c = 0; c < 5; c++) {
    const expected = grid[c].join(",");
    const got = result.columns[c].visible.join(",");
    assert(
      got === expected,
      `${gameId} col${c + 1}: visible = grid final`
    );
  }
}

console.log("\n=== 7. API tardía: carretes no aterrizan antes del resultado ===");
{
  const gameId: SlotGameId = "moon-wolf";
  const game = getSlotGame(gameId)!;
  const ids = Object.keys(game.symbols);
  const grid = Array.from({ length: 5 }, () => ["a", "k", "q"] as string[]);

  const earlyApi = simulateMachineSpin({
    gameId,
    grid,
    allSymbolIds: ids,
    cellHeight: 72,
    apiDelayMs: 50,
    rng: seededRng,
  });
  const lateApi = simulateMachineSpin({
    gameId,
    grid,
    allSymbolIds: ids,
    cellHeight: 72,
    apiDelayMs: 2000,
    rng: seededRng,
  });

  assert(earlyApi.finalized && lateApi.finalized, "ambos escenarios finalizan");
  assert(
    lateApi.maxDurationMs >= earlyApi.maxDurationMs,
    "API tardía alarga el ciclo total"
  );
}

console.log("\n=== 8. Cancelación forzada (error/timeout del padre) ===");
{
  const sim = new ReelMotionSimulator({
    columnIndex: 2,
    finalSymbols: ["j", "q", "a"],
    allSymbolIds: SYMBOLS,
    gameId: "moon-wolf",
    cellHeight: 72,
    mobile: true,
    rng: seededRng,
  });
  sim.startSpin();
  for (let t = 0; t < 400; t += 16) sim.tick(t);
  assert(sim.phase !== "idle", "carrete en movimiento antes de cancelar");
  sim.forceIdle();
  assert(sim.stopped, "forceIdle detiene carrete");
  assertEq(sim.phase, "idle", "forceIdle vuelve a idle");
}

console.log("\n=== 9. Sync tryFinalizeSpin (ModernSlotMachine) ===");
assert(canFinalizeSpin(true, true, true), "finaliza cuando carretes+API+result");
assert(!canFinalizeSpin(false, true, true), "no finaliza si carretes girando");
assert(!canFinalizeSpin(true, false, true), "no finaliza si API pendiente");
assert(!canFinalizeSpin(true, true, false), "no finaliza sin resultado");

console.log("\n=== 10. Decel: offset objetivo = finalOffset del strip ===");
{
  const cellH = 80;
  const strip = buildStrip(["wild", "scatter", "k"], SYMBOLS, 6, seededRng);
  const target = finalOffset(strip.length, cellH);
  assert(
    target === (strip.length - VISIBLE_ROWS) * cellH,
    "target offset alinea ventana 3×5"
  );
  const sim = new ReelMotionSimulator({
    columnIndex: 4,
    finalSymbols: ["wild", "scatter", "k"],
    allSymbolIds: SYMBOLS,
    gameId: "magic-lamp",
    cellHeight: cellH,
    mobile: false,
    rng: seededRng,
  });
  sim.startSpin();
  sim.markResultReady();
  for (let t = 0; t < 10000; t += 16) {
    if (!sim.tick(t) && sim.stopped) break;
  }
  const expected = finalOffset(sim.strip.length, cellH);
  assertEq(sim.offset, expected, "offset final = finalOffset tras decel");
  assert(
    sim.snapshot().visible.join(",") === "wild,scatter,k",
    "símbolos visibles tras decel"
  );
}

console.log("\n=== 11. Reduced motion: carretes no se congelan ===");
{
  const gameId: SlotGameId = "moon-wolf";
  const game = getSlotGame(gameId)!;
  const ids = Object.keys(game.symbols);
  const grid = Array.from({ length: 5 }, () => ["a", "k", "q"] as string[]);

  const result = simulateMachineSpin({
    gameId,
    grid,
    allSymbolIds: ids,
    cellHeight: 72,
    mobile: true,
    reducedMotion: true,
    apiDelayMs: 150,
    rng: seededRng,
  });

  assert(result.finalized, "reduced motion: ciclo completo finaliza");
  assert(result.allStopped, "reduced motion: todos los carretes paran");
  assert(
    result.maxDurationMs >= 2400,
    `reduced motion: duración mínima 2.4s (${result.maxDurationMs}ms)`
  );
}

console.log("\n=== 12. Decel offsets: siempre avanza hacia la rejilla ===");
{
  const cellH = 72;
  const stripLen = 99;
  const loopH = loopHeightPx(cellH);
  const final = finalOffset(stripLen, cellH);
  const mid = computeDecelOffsets(2400, stripLen, cellH);
  assert(mid.startOffset < loopH, "startOffset usa posición del bucle");
  assert(
    mid.snapOffset >= mid.startOffset,
    "snapOffset nunca retrocede"
  );
  assertEq(mid.snapOffset, final, "snapOffset aterriza en finalOffset");
}

console.log("\n=== 13. Deceleración digital (interpolación expo) ===");
{
  const start = 120;
  const end = 6800;
  const mid = interpolateDecelOffset(start, end, 0.5);
  assert(mid > start && mid < end, "interpolación avanza sin saltos");
  assertEq(interpolateDecelOffset(start, end, 1), end, "t=1 llega al destino");
  assert(interpolateDecelOffset(start, end, 0.75) > end * 0.7, "expo-out rápido al final");
}

console.log(`\n=== RESULTADO: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
