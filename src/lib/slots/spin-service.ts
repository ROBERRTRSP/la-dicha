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

const AUTO_FREE_SPIN_EVERY_PAID_SPINS = 4;
const AUTO_FREE_SPIN_AWARD = 1;

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

  // La apuesta efectiva NUNCA la decide el cliente en giros gratis: se usa la
  // apuesta congelada que disparó el bono. Esto evita inflar premios enviando
  // un betAmount arbitrario durante la ronda gratis.
  let effectiveBet: number;
  if (isFreeSpin) {
    const frozenBet = bonusBefore.freeSpinBetAmount ?? 0;
    if (!frozenBet || frozenBet <= 0) {
      throw new Error("Estado de giros gratis inválido. Vuelve a intentarlo.");
    }
    validateSlotBet(frozenBet, settings.minBetAmount, settings.maxBetAmount, gameId);
    effectiveBet = frozenBet;
  } else {
    validateSlotBet(betAmount, settings.minBetAmount, settings.maxBetAmount, gameId);
    effectiveBet = betAmount;
  }

  const grid = spinGrid(
    (await import("./games")).getSlotGame(gameId)!
  );
  const result = evaluateSpin(gameId, grid, effectiveBet, bonusBefore, isFreeSpin);
  const baseBonusAfter = nextBonusState(gameId, bonusBefore, result, isFreeSpin);

  const stake = isFreeSpin ? 0 : betAmount;
  const profit = Math.round((result.payout - stake) * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Billetera no encontrada.");

    const balanceBefore = wallet.balance;
    let bonusAfter = { ...baseBonusAfter };
    let autoFreeSpinsAwarded = 0;

    if (!isFreeSpin) {
      const paidSpinsBefore = await tx.slotSpin.count({
        where: { userId, gameId, isFreeSpin: false },
      });
      const paidSpinsAfterCurrent = paidSpinsBefore + 1;
      if (paidSpinsAfterCurrent % AUTO_FREE_SPIN_EVERY_PAID_SPINS === 0) {
        autoFreeSpinsAwarded = AUTO_FREE_SPIN_AWARD;
        bonusAfter.freeSpinsLeft += autoFreeSpinsAwarded;
      }
    }

    // Congelar / mantener / limpiar la apuesta de la ronda de giros gratis.
    let freeSpinBetAmount = bonusBefore.freeSpinBetAmount ?? 0;
    if (
      !isFreeSpin &&
      (result.bonusTriggered === "FREE_SPINS" || autoFreeSpinsAwarded > 0)
    ) {
      freeSpinBetAmount = betAmount;
    }
    if (bonusAfter.freeSpinsLeft <= 0) {
      freeSpinBetAmount = 0;
    }
    bonusAfter.freeSpinBetAmount = freeSpinBetAmount;

    // Débito atómico: evita doble gasto si llegan dos POST concurrentes.
    if (!isFreeSpin) {
      const debited = await tx.wallet.updateMany({
        where: { userId, balance: { gte: betAmount } },
        data: { balance: { decrement: betAmount } },
      });
      if (debited.count !== 1) {
        throw new Error("Saldo insuficiente.");
      }
    }

    if (result.payout > 0) {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: result.payout } },
      });
    }

    const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
    const balanceAfter = updatedWallet?.balance ?? balanceBefore;

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

    const autoFreeMessage =
      autoFreeSpinsAwarded > 0
        ? `¡Bono automático! +${autoFreeSpinsAwarded} giro gratis por completar ${AUTO_FREE_SPIN_EVERY_PAID_SPINS} giros pagados.`
        : null;
    const finalMessage =
      result.message && autoFreeMessage
        ? `${result.message} · ${autoFreeMessage}`
        : result.message ?? autoFreeMessage;
    const bonusTriggered =
      result.bonusTriggered ??
      (autoFreeSpinsAwarded > 0 ? "FREE_SPINS_AUTO" : null);

    const spin = await tx.slotSpin.create({
      data: {
        userId,
        gameId,
        betAmount: effectiveBet,
        grid: JSON.stringify(result.grid),
        payout: result.payout,
        profit,
        bonusTriggered,
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
        freeSpinBetAmount: bonusAfter.freeSpinBetAmount ?? 0,
      },
      update: {
        freeSpinsLeft: bonusAfter.freeSpinsLeft,
        multiplier: bonusAfter.multiplier,
        progressiveMultiplier: bonusAfter.progressiveMultiplier,
        freeSpinBetAmount: bonusAfter.freeSpinBetAmount ?? 0,
      },
    });

    return {
      spinId: spin.id,
      balance: balanceAfter,
      grid: result.grid,
      lineWins: result.lineWins,
      winningCells: result.winningCells,
      scatterCells: result.scatterCells,
      payout: result.payout,
      profit,
      scatterCount: result.scatterCount,
      bonusTriggered,
      freeSpinsAwarded: result.freeSpinsAwarded,
      autoFreeSpinsAwarded,
      jackpotTier: result.jackpotTier,
      jackpotAmount: result.jackpotAmount,
      multiplierApplied: result.multiplierApplied,
      message: finalMessage,
      bonus: bonusAfter,
      isFreeSpin,
    };
  });
}

export async function getSlotSpinHistory(
  userId: string,
  gameId: string,
  limit = 8
) {
  const rows = await prisma.slotSpin.findMany({
    where: { userId, gameId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      betAmount: true,
      payout: true,
      createdAt: true,
      isFreeSpin: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    bet: row.betAmount,
    win: row.payout,
    at: row.createdAt.getTime(),
    isFreeSpin: row.isFreeSpin,
  }));
}

export { isSlotsActive, getSlotSettings, getBonusState, saveBonusState };
