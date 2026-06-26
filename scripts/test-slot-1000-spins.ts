/**
 * Prueba masiva de tragamonedas: 1000 jugadas por cada slot.
 *
 * Valida motor, payouts, bonos, celdas ganadoras y estados sin tocar la BD.
 * Ejecutar: npm run test:slot-1000
 */
import { evaluateSpin, nextBonusState, spinGrid } from "../src/lib/slots/engine";
import { SLOT_GAME_LIST } from "../src/lib/slots/games";
import { PAYLINES_5x3, readPayline } from "../src/lib/slots/paylines";
import type { BonusState, SlotGameConfig, SpinResult } from "../src/lib/slots/types";

const SPINS_PER_GAME = 1000;
const START_BALANCE = 1_000_000;
const BET_BY_GAME: Record<string, number> = {
  "treasure-skunk": 10,
  "magic-lamp": 10,
  "golden-ox": 10,
  "moon-wolf": 10,
  "classic-7": 10,
};

type GameStats = {
  spins: number;
  paidSpins: number;
  freeSpins: number;
  wins: number;
  totalBet: number;
  totalPayout: number;
  maxPayout: number;
  bonusTriggers: number;
  jackpots: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function defaultBonus(): BonusState {
  return {
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
    freeSpinBetAmount: 0,
  };
}

function validateGrid(game: SlotGameConfig, result: SpinResult): void {
  assert(result.grid.length === game.cols, `${game.id}: grid debe tener ${game.cols} columnas`);
  for (let col = 0; col < game.cols; col++) {
    const column = result.grid[col];
    assert(Array.isArray(column), `${game.id}: columna ${col} no es array`);
    assert(column.length === game.rows, `${game.id}: columna ${col} debe tener ${game.rows} filas`);
    for (let row = 0; row < game.rows; row++) {
      const symbolId = column[row];
      assert(Boolean(game.symbols[symbolId]), `${game.id}: símbolo inválido ${symbolId} en ${col}:${row}`);
    }
  }
}

function validateCells(game: SlotGameConfig, result: SpinResult): void {
  for (const cell of [...result.winningCells, ...result.scatterCells]) {
    assert(
      Number.isInteger(cell.col) &&
        Number.isInteger(cell.row) &&
        cell.col >= 0 &&
        cell.col < game.cols &&
        cell.row >= 0 &&
        cell.row < game.rows,
      `${game.id}: celda fuera de rango ${JSON.stringify(cell)}`
    );
  }

  const scatterCount = result.grid.flat().filter((s) => game.scatterIds.includes(s)).length;
  assert(result.scatterCount === scatterCount, `${game.id}: scatterCount inconsistente`);
  assert(result.scatterCells.length === scatterCount, `${game.id}: scatterCells inconsistente`);
}

function validateLineWins(game: SlotGameConfig, result: SpinResult, effectiveBet: number): void {
  const betPerLine = effectiveBet / game.paylineCount;
  const lines = PAYLINES_5x3.slice(0, game.paylineCount);

  for (const win of result.lineWins) {
    assert(win.lineIndex >= 0 && win.lineIndex < game.paylineCount, `${game.id}: línea inválida`);
    const sym = game.symbols[win.symbolId];
    assert(Boolean(sym), `${game.id}: win symbol inválido ${win.symbolId}`);
    assert(Boolean(sym.pays[win.count]), `${game.id}: pago no definido para ${win.symbolId} x${win.count}`);

    const line = lines[win.lineIndex];
    const visible = readPayline(result.grid, line);
    for (let i = 0; i < win.count; i++) {
      assert(
        visible[i] === win.symbolId || visible[i] === game.wildId,
        `${game.id}: línea ${win.lineIndex} no coincide con win ${win.symbolId} x${win.count}`
      );
    }

    const expected = round2(betPerLine * (sym.pays[win.count] ?? 0));
    assert(win.payout === expected, `${game.id}: payout de línea esperado ${expected}, obtuvo ${win.payout}`);
  }
}

function validatePayout(game: SlotGameConfig, result: SpinResult): void {
  const lineTotal = round2(result.lineWins.reduce((sum, win) => sum + win.payout, 0));
  const expected = round2(lineTotal * result.multiplierApplied + result.jackpotAmount);

  assert(Number.isFinite(result.payout), `${game.id}: payout no finito`);
  assert(result.payout >= 0, `${game.id}: payout negativo`);
  assert(result.payout === expected, `${game.id}: payout esperado ${expected}, obtuvo ${result.payout}`);

  if (result.jackpotTier) {
    assert(game.bonus.type === "ox_jackpot", `${game.id}: jackpot fuera de Golden Ox`);
    assert(result.jackpotAmount > 0, `${game.id}: jackpot sin monto`);
  } else {
    assert(result.jackpotAmount === 0, `${game.id}: jackpotAmount sin tier`);
  }
}

function validateClassic7(game: SlotGameConfig, result: SpinResult): void {
  if (game.id !== "classic-7") return;
  assert(result.scatterCount === 0, "classic-7: no debe tener scatters");
  assert(result.scatterCells.length === 0, "classic-7: scatterCells debe estar vacío");
  assert(result.bonusTriggered === null, "classic-7: no debe disparar bono");
  assert(result.freeSpinsAwarded === 0, "classic-7: freeSpinsAwarded debe ser 0");
  assert(result.multiplierApplied === 1, "classic-7: multiplicador debe ser 1");
}

function validateFreeSpinAward(game: SlotGameConfig, result: SpinResult): void {
  if (result.bonusTriggered === "FREE_SPINS") {
    assert(
      result.freeSpinsAwarded > 0,
      `${game.id}: FREE_SPINS debe otorgar giros gratis`
    );
    return;
  }
  assert(
    result.freeSpinsAwarded === 0,
    `${game.id}: sin bono no debe asignar freeSpinsAwarded`
  );
}

function applyFrozenBet(
  game: SlotGameConfig,
  bonusBefore: BonusState,
  bonusAfter: BonusState,
  result: SpinResult,
  effectiveBet: number,
  isFreeSpin: boolean
): BonusState {
  const next = { ...bonusAfter };
  let frozenBet = bonusBefore.freeSpinBetAmount ?? 0;

  if (result.bonusTriggered === "FREE_SPINS" && !isFreeSpin) {
    frozenBet = effectiveBet;
  }
  if (next.freeSpinsLeft <= 0) {
    frozenBet = 0;
  }
  next.freeSpinBetAmount = frozenBet;

  assert(next.freeSpinsLeft >= 0, `${game.id}: freeSpinsLeft negativo`);
  assert(next.multiplier >= 1, `${game.id}: multiplier inválido`);
  assert(next.progressiveMultiplier >= 1, `${game.id}: progressiveMultiplier inválido`);
  return next;
}

function runGame(game: SlotGameConfig): GameStats {
  const baseBet = BET_BY_GAME[game.id] ?? 10;
  let balance = START_BALANCE;
  let bonus = defaultBonus();
  const stats: GameStats = {
    spins: 0,
    paidSpins: 0,
    freeSpins: 0,
    wins: 0,
    totalBet: 0,
    totalPayout: 0,
    maxPayout: 0,
    bonusTriggers: 0,
    jackpots: 0,
  };

  for (let i = 0; i < SPINS_PER_GAME; i++) {
    const isFreeSpin = bonus.freeSpinsLeft > 0;
    const effectiveBet = isFreeSpin ? bonus.freeSpinBetAmount ?? 0 : baseBet;
    assert(effectiveBet > 0, `${game.id}: apuesta efectiva inválida`);

    if (!isFreeSpin) {
      assert(balance >= baseBet, `${game.id}: balance virtual insuficiente`);
      balance = round2(balance - baseBet);
      stats.totalBet = round2(stats.totalBet + baseBet);
      stats.paidSpins++;
    } else {
      stats.freeSpins++;
    }

    const grid = spinGrid(game);
    const result = evaluateSpin(game.id, grid, effectiveBet, bonus, isFreeSpin);

    validateGrid(game, result);
    validateCells(game, result);
    validateLineWins(game, result, effectiveBet);
    validatePayout(game, result);
    validateClassic7(game, result);
    validateFreeSpinAward(game, result);

    if (result.payout > 0) stats.wins++;
    if (result.bonusTriggered) stats.bonusTriggers++;
    if (result.jackpotTier) stats.jackpots++;
    stats.maxPayout = Math.max(stats.maxPayout, result.payout);
    stats.totalPayout = round2(stats.totalPayout + result.payout);
    balance = round2(balance + result.payout);

    const bonusAfter = nextBonusState(game.id, bonus, result, isFreeSpin);
    bonus = applyFrozenBet(game, bonus, bonusAfter, result, effectiveBet, isFreeSpin);
    stats.spins++;
  }

  assert(stats.spins === SPINS_PER_GAME, `${game.id}: no completó ${SPINS_PER_GAME} jugadas`);
  return stats;
}

console.log(`\n=== Slot mass test: ${SPINS_PER_GAME} jugadas por juego ===`);

let totalSpins = 0;
for (const game of SLOT_GAME_LIST) {
  const stats = runGame(game);
  totalSpins += stats.spins;
  const rtpSample = stats.totalBet > 0 ? round2((stats.totalPayout / stats.totalBet) * 100) : 0;
  console.log(
    [
      `  ✓ ${game.id}`,
      `${stats.spins} spins`,
      `${stats.paidSpins} pagados`,
      `${stats.freeSpins} gratis`,
      `${stats.wins} wins`,
      `bonos ${stats.bonusTriggers}`,
      `jackpots ${stats.jackpots}`,
      `max ${stats.maxPayout}`,
      `RTP muestra ${rtpSample}%`,
    ].join(" · ")
  );
}

console.log(`\n=== RESULTADO: ${totalSpins} jugadas validadas, 0 errores ===\n`);
