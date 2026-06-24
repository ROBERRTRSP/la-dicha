import { prisma } from "../db";
import { isSlotGameId } from "./games";
import {
  evaluateSpin,
  nextBonusState,
  spinGrid,
} from "./engine";
import {
  getBonusState,
  getSlotSettings,
  isSlotsActive,
  saveBonusState,
  validateSlotBet,
} from "./settings";

export async function placeSlotSpin(userId: string, gameId: string, betAmount: number) {
  if (!isSlotGameId(gameId)) {
    throw new Error("Juego de tragamonedas no válido.");
  }

  const settings = await getSlotSettings();
  if (!settings.active) {
    throw new Error("Tragamonedas desactivadas temporalmente.");
  }

  const bonusBefore = await getBonusState(userId, gameId);
  const isFreeSpin = bonusBefore.freeSpinsLeft > 0;
  const effectiveBet = isFreeSpin ? betAmount : betAmount;

  if (!isFreeSpin) {
    validateSlotBet(betAmount, settings.minBetAmount, settings.maxBetAmount);
  }

  const grid = spinGrid(
    (await import("./games")).getSlotGame(gameId)!
  );
  const result = evaluateSpin(gameId, grid, effectiveBet, bonusBefore, isFreeSpin);
  const bonusAfter = nextBonusState(gameId, bonusBefore, result, isFreeSpin);

  const stake = isFreeSpin ? 0 : betAmount;
  const profit = Math.round((result.payout - stake) * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Billetera no encontrada.");

    const balanceBefore = wallet.balance;
    if (!isFreeSpin && balanceBefore < betAmount) {
      throw new Error("Saldo insuficiente.");
    }

    const balanceAfter = Math.round(
      (balanceBefore - stake + result.payout) * 100
    ) / 100;

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    if (!isFreeSpin) {
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "SLOT_BET",
          amount: -betAmount,
          balanceBefore,
          balanceAfter: Math.round((balanceBefore - betAmount) * 100) / 100,
          note: `Slot ${gameId}`,
        },
      });
    }

    if (result.payout > 0) {
      const beforeWin = Math.round((balanceAfter - result.payout) * 100) / 100;
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "SLOT_WIN",
          amount: result.payout,
          balanceBefore: beforeWin,
          balanceAfter,
          note: `Slot ${gameId}${result.jackpotTier ? ` ${result.jackpotTier}` : ""}`,
        },
      });
    }

    const spin = await tx.slotSpin.create({
      data: {
        userId,
        gameId,
        betAmount: effectiveBet,
        grid: JSON.stringify(result.grid),
        payout: result.payout,
        profit,
        bonusTriggered: result.bonusTriggered,
        isFreeSpin,
        multiplierUsed: result.multiplierApplied,
        jackpotTier: result.jackpotTier,
      },
    });

    await tx.slotBonusState.upsert({
      where: { userId_gameId: { userId, gameId } },
      create: {
        userId,
        gameId,
        freeSpinsLeft: bonusAfter.freeSpinsLeft,
        multiplier: bonusAfter.multiplier,
        progressiveMultiplier: bonusAfter.progressiveMultiplier,
      },
      update: {
        freeSpinsLeft: bonusAfter.freeSpinsLeft,
        multiplier: bonusAfter.multiplier,
        progressiveMultiplier: bonusAfter.progressiveMultiplier,
      },
    });

    return {
      spinId: spin.id,
      balance: balanceAfter,
      grid: result.grid,
      lineWins: result.lineWins,
      payout: result.payout,
      profit,
      scatterCount: result.scatterCount,
      bonusTriggered: result.bonusTriggered,
      jackpotTier: result.jackpotTier,
      jackpotAmount: result.jackpotAmount,
      multiplierApplied: result.multiplierApplied,
      message: result.message,
      bonus: bonusAfter,
      isFreeSpin,
    };
  });
}

export { isSlotsActive, getSlotSettings, getBonusState, saveBonusState };
