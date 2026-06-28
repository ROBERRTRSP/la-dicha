import { randomInt } from "crypto";
import { getSlotGame } from "./games";
import { formatJackpotMessage } from "./jackpot-labels";
import { PAYLINES_5x3, readPayline } from "./paylines";
import type {
  BonusState,
  Grid,
  LineWin,
  SlotGameConfig,
  SpinResult,
  WinCell,
} from "./types";

export function spinGrid(game: SlotGameConfig): Grid {
  const grid: Grid = [];
  for (let col = 0; col < game.cols; col++) {
    const strip = game.reelStrips[col] ?? game.reelStrips[0];
    const start = randomInt(0, strip.length);
    const column: string[] = [];
    for (let row = 0; row < game.rows; row++) {
      column.push(strip[(start + row) % strip.length]);
    }
    grid.push(column);
  }
  return grid;
}

function countScatters(grid: Grid, scatterIds: string[]): number {
  let n = 0;
  for (const col of grid) {
    for (const sym of col) {
      if (scatterIds.includes(sym)) n++;
    }
  }
  return n;
}

function evaluateLine(
  symbols: string[],
  game: SlotGameConfig,
  betPerLine: number
): LineWin | null {
  const wildId = game.wildId;
  const paySym =
    symbols.find((s) => s !== wildId && !game.symbols[s]?.isScatter) ??
    wildId;

  let count = 0;
  for (const sym of symbols) {
    if (sym === paySym || sym === wildId) count++;
    else break;
  }

  const symDef = game.symbols[paySym];
  const minMatch = symDef?.pays[2] ? 2 : 3;
  if (count < minMatch) return null;

  let matchCount: 2 | 3 | 4 | 5 | null = null;
  if (count >= 5 && symDef?.pays[5]) matchCount = 5;
  else if (count >= 4 && symDef?.pays[4]) matchCount = 4;
  else if (count >= 3 && symDef?.pays[3]) matchCount = 3;
  else if (count >= 2 && symDef?.pays[2]) matchCount = 2;
  if (!matchCount) return null;

  const pays = symDef?.pays[matchCount];
  if (!pays) return null;

  return {
    lineIndex: -1,
    symbolId: paySym,
    count: matchCount,
    payout: Math.round(betPerLine * pays * 100) / 100,
  };
}

function oxFireMultiplier(grid: Grid): number {
  const fires = countScatters(grid, ["FIRE"]);
  if (fires >= 5) return 10;
  if (fires >= 4) return 5;
  if (fires >= 3) return 2;
  return 1;
}

function rollOxJackpot(betAmount: number): {
  tier: "MINOR" | "MAJOR" | "GRAND" | null;
  amount: number;
} {
  const roll = randomInt(0, 10000);
  if (roll < 3) {
    return { tier: "GRAND", amount: betAmount * 500 };
  }
  if (roll < 25) {
    return { tier: "MAJOR", amount: betAmount * 100 };
  }
  if (roll < 120) {
    return { tier: "MINOR", amount: betAmount * 25 };
  }
  return { tier: null, amount: 0 };
}

function lampBonusMultiplier(): number {
  const options = [2, 2, 3, 3, 4, 5];
  return options[randomInt(0, options.length)];
}

function randomFreeSpinsAward(
  gameId: string,
  fallback: number
): number {
  let options: number[] = [];
  if (gameId === "treasure-skunk") {
    options = [8, 9, 10, 11, 12];
  } else if (gameId === "magic-lamp") {
    options = [6, 7, 8, 9, 10, 12];
  } else if (gameId === "moon-wolf") {
    options = [10, 11, 12, 13, 14, 16];
  }

  if (options.length === 0) {
    return Math.max(0, fallback);
  }

  return options[randomInt(0, options.length)] ?? Math.max(0, fallback);
}

export function evaluateSpin(
  gameId: string,
  grid: Grid,
  betAmount: number,
  bonus: BonusState,
  isFreeSpin: boolean
): SpinResult {
  const game = getSlotGame(gameId);
  if (!game) {
    throw new Error("Juego no válido.");
  }

  const betPerLine = betAmount / game.paylineCount;
  const lineWins: LineWin[] = [];
  const winCellSet = new Set<string>();
  const lines = PAYLINES_5x3.slice(0, game.paylineCount);

  lines.forEach((line, index) => {
    const symbols = readPayline(grid, line);
    const win = evaluateLine(symbols, game, betPerLine);
    if (win) {
      lineWins.push({ ...win, lineIndex: index });
      for (let col = 0; col < win.count; col++) {
        winCellSet.add(`${col}:${line[col]}`);
      }
    }
  });

  const winningCells: WinCell[] = Array.from(winCellSet).map((k) => {
    const [col, row] = k.split(":").map(Number);
    return { col, row };
  });

  const scatterCells: WinCell[] = [];
  grid.forEach((column, col) => {
    column.forEach((sym, row) => {
      if (game.scatterIds.includes(sym)) scatterCells.push({ col, row });
    });
  });

  let linePayout = lineWins.reduce((s, w) => s + w.payout, 0);
  const scatterCount = countScatters(grid, game.scatterIds);

  let multiplierApplied = 1;
  let bonusTriggered: string | null = null;
  let freeSpinsAwarded = 0;
  let jackpotTier: "MINOR" | "MAJOR" | "GRAND" | null = null;
  let jackpotAmount = 0;
  let message: string | null = null;

  if (game.bonus.type === "lamp_multiplier") {
    multiplierApplied = isFreeSpin
      ? bonus.multiplier
      : scatterCount >= 3
        ? lampBonusMultiplier()
        : 1;
    if (scatterCount >= game.bonus.scatterCount && !isFreeSpin) {
      bonusTriggered = "FREE_SPINS";
      freeSpinsAwarded = randomFreeSpinsAward(game.id, game.bonus.freeSpinsAwarded);
      message = `¡${freeSpinsAwarded} giros gratis! Multiplicador ×${multiplierApplied}`;
    } else if (isFreeSpin && scatterCount >= 1) {
      multiplierApplied = Math.max(multiplierApplied, lampBonusMultiplier());
      message = `Lámpara mágica · multiplicador ×${multiplierApplied}`;
    }
  }

  if (game.bonus.type === "chest_free" && scatterCount >= game.bonus.scatterCount && !isFreeSpin) {
    bonusTriggered = "FREE_SPINS";
    freeSpinsAwarded = randomFreeSpinsAward(game.id, game.bonus.freeSpinsAwarded);
    message = `¡3 cofres! Ronda de ${freeSpinsAwarded} giros gratis`;
  }

  if (game.bonus.type === "moon_progressive") {
    multiplierApplied = isFreeSpin ? bonus.progressiveMultiplier : 1;
    if (scatterCount >= game.bonus.scatterCount && !isFreeSpin) {
      bonusTriggered = "FREE_SPINS";
      freeSpinsAwarded = randomFreeSpinsAward(game.id, game.bonus.freeSpinsAwarded);
      message = `¡Giros nocturnos! +${freeSpinsAwarded} giros con multiplicador progresivo`;
    }
  }

  if (game.bonus.type === "ox_jackpot") {
    multiplierApplied = oxFireMultiplier(grid);
    const jp = rollOxJackpot(betAmount);
    jackpotTier = jp.tier;
    jackpotAmount = jp.amount;
    if (jp.tier) {
      message = formatJackpotMessage(jp.tier);
    } else if (multiplierApplied > 1) {
      message = `Fuego ×${multiplierApplied}`;
    }
  }

  linePayout = Math.round(linePayout * multiplierApplied * 100) / 100;
  const payout = Math.round((linePayout + jackpotAmount) * 100) / 100;

  return {
    grid,
    lineWins,
    winningCells,
    scatterCells,
    scatterCount,
    payout,
    bonusTriggered,
    freeSpinsAwarded,
    jackpotTier,
    jackpotAmount,
    multiplierApplied,
    message,
  };
}

export function nextBonusState(
  gameId: string,
  current: BonusState,
  result: SpinResult,
  isFreeSpin: boolean
): BonusState {
  const game = getSlotGame(gameId);
  if (!game) return current;

  let {
    freeSpinsLeft,
    multiplier,
    progressiveMultiplier,
  } = { ...current };

  if (result.bonusTriggered === "FREE_SPINS") {
    const awarded = Math.max(0, result.freeSpinsAwarded || game.bonus.freeSpinsAwarded);
    freeSpinsLeft += awarded;
    if (game.bonus.type === "lamp_multiplier") {
      multiplier = result.multiplierApplied;
    }
    if (game.bonus.type === "moon_progressive") {
      progressiveMultiplier = 1;
    }
  }

  if (isFreeSpin) {
    freeSpinsLeft = Math.max(0, freeSpinsLeft - 1);
    if (game.bonus.type === "moon_progressive") {
      progressiveMultiplier += 1;
    }
  }

  if (freeSpinsLeft === 0) {
    multiplier = 1;
    progressiveMultiplier = 1;
  }

  return { freeSpinsLeft, multiplier, progressiveMultiplier };
}
