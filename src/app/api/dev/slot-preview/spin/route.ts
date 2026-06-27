import { NextResponse } from "next/server";
import { evaluateSpin, nextBonusState } from "@/lib/slots/engine";
import { getSlotGame, isSlotGameId } from "@/lib/slots/games";
import { isSlotVisualPreviewEnabled } from "@/lib/slots/preview-access";
import type { BonusState, Grid, SlotGameConfig } from "@/lib/slots/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PreviewSpinRequest = {
  gameId: string;
  betAmount: number;
  bonus?: BonusState;
  mode?: "auto" | "win" | "lose";
};

const DEFAULT_BONUS: BonusState = {
  freeSpinsLeft: 0,
  multiplier: 1,
  progressiveMultiplier: 1,
  freeSpinBetAmount: 0,
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function activeSymbolIds(game: SlotGameConfig): string[] {
  return Object.keys(game.symbols).filter((id) => !game.symbols[id]?.isScatter);
}

function payoutSymbol(game: SlotGameConfig): string {
  return (
    Object.keys(game.symbols).find((id) => {
      const sym = game.symbols[id];
      return !sym?.isWild && !sym?.isScatter && Boolean(sym?.pays[3] || sym?.pays[5]);
    }) ?? activeSymbolIds(game)[0]!
  );
}

function makeWinningGrid(game: SlotGameConfig): Grid {
  const ids = activeSymbolIds(game);
  const payId = payoutSymbol(game);
  return Array.from({ length: game.cols }, (_, col) => {
    const altA = ids[(col + 1) % ids.length] ?? payId;
    const altB = ids[(col + 2) % ids.length] ?? payId;
    return [altA, payId, altB];
  });
}

function makeLosingGrid(game: SlotGameConfig, bonus: BonusState): Grid {
  const ids = activeSymbolIds(game).filter((id) => id !== game.wildId);
  const maxAttempts = 80;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid: Grid = Array.from({ length: game.cols }, (_, col) => {
      const idA = ids[(col * 2 + attempt) % ids.length] ?? ids[0]!;
      const idB = ids[(col * 2 + attempt + 1) % ids.length] ?? ids[0]!;
      const idC = ids[(col * 2 + attempt + 2) % ids.length] ?? ids[0]!;
      return [idA, idB, idC];
    });

    const evalResult = evaluateSpin(game.id, grid, 1, bonus, false);
    if (evalResult.payout === 0 && evalResult.scatterCount === 0) {
      return grid;
    }
  }

  return Array.from({ length: game.cols }, (_, col) => {
    const a = ids[col % ids.length] ?? ids[0]!;
    const b = ids[(col + 1) % ids.length] ?? ids[0]!;
    const c = ids[(col + 2) % ids.length] ?? ids[0]!;
    return [a, b, c];
  });
}

function sanitizeBonus(input?: BonusState): BonusState {
  if (!input) return { ...DEFAULT_BONUS };
  return {
    freeSpinsLeft: Math.max(0, Math.floor(input.freeSpinsLeft || 0)),
    multiplier: Math.max(1, Math.floor(input.multiplier || 1)),
    progressiveMultiplier: Math.max(1, Math.floor(input.progressiveMultiplier || 1)),
    freeSpinBetAmount: Math.max(0, Number(input.freeSpinBetAmount || 0)),
  };
}

export async function POST(request: Request) {
  if (!isSlotVisualPreviewEnabled()) {
    return NextResponse.json({ error: "Preview disabled." }, { status: 404 });
  }

  let body: PreviewSpinRequest;
  try {
    body = (await request.json()) as PreviewSpinRequest;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!isSlotGameId(body.gameId)) {
    return NextResponse.json({ error: "Invalid game." }, { status: 400 });
  }

  const game = getSlotGame(body.gameId);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 400 });
  }

  const bonusBefore = sanitizeBonus(body.bonus);
  const isFreeSpin = bonusBefore.freeSpinsLeft > 0;
  const baseBet = Math.max(1, Number(body.betAmount || 1));
  const effectiveBet = isFreeSpin
    ? Math.max(1, Number(bonusBefore.freeSpinBetAmount || baseBet))
    : baseBet;

  const mode = body.mode === "win" || body.mode === "lose" ? body.mode : "auto";
  const resolvedMode = mode === "auto" ? randomItem(["win", "lose"]) : mode;
  const grid =
    resolvedMode === "win"
      ? makeWinningGrid(game)
      : makeLosingGrid(game, bonusBefore);

  const result = evaluateSpin(game.id, grid, effectiveBet, bonusBefore, isFreeSpin);
  const bonusAfter = nextBonusState(game.id, bonusBefore, result, isFreeSpin);

  const message =
    result.payout > 0
      ? null
      : "Sin premio este giro";

  return NextResponse.json({
    balanceDelta: result.payout - (isFreeSpin ? 0 : baseBet),
    grid: result.grid,
    lineWins: result.lineWins,
    winningCells: result.winningCells,
    scatterCells: result.scatterCells,
    payout: result.payout,
    message,
    bonus: bonusAfter,
    isFreeSpin,
    jackpotTier: result.jackpotTier,
    multiplierApplied: result.multiplierApplied,
  });
}
