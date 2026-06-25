import { prisma } from "../db";
import type { BonusState } from "./types";

const DEFAULT_SETTINGS = {
  active: true,
  minBetAmount: 1,
  maxBetAmount: 10,
};

export async function getSlotSettings() {
  const row = await prisma.slotSettings.findUnique({
    where: { id: "default" },
  });
  return row ?? DEFAULT_SETTINGS;
}

export async function isSlotsActive() {
  const s = await getSlotSettings();
  return s.active;
}

export const SLOT_BET_OPTIONS = [1, 2, 5, 10] as const;

export const CLASSIC_7_BET_OPTIONS = [1, 2, 5, 10, 25, 50, 100] as const;

export function betOptionsForGame(gameId: string) {
  return gameId === "classic-7" ? CLASSIC_7_BET_OPTIONS : SLOT_BET_OPTIONS;
}

export function validateSlotBet(
  amount: number,
  min: number,
  max: number,
  gameId?: string
) {
  const options = betOptionsForGame(gameId ?? "");
  const effectiveMax =
    gameId === "classic-7" ? Math.max(max, 100) : max;
  const valid = (options as readonly number[]).includes(amount);
  if (!valid) {
    throw new Error(
      gameId === "classic-7"
        ? "Apuesta no válida. Usa 1, 2, 5, 10, 25, 50 o 100."
        : "Apuesta no válida. Usa 1, 2, 5 o 10."
    );
  }
  if (amount < min || amount > effectiveMax) {
    throw new Error(`Apuesta entre ${min.toFixed(2)} y ${effectiveMax.toFixed(2)}.`);
  }
}

export async function getBonusState(
  userId: string,
  gameId: string
): Promise<BonusState> {
  const row = await prisma.slotBonusState.findUnique({
    where: { userId_gameId: { userId, gameId } },
  });
  return {
    freeSpinsLeft: row?.freeSpinsLeft ?? 0,
    multiplier: row?.multiplier ?? 1,
    progressiveMultiplier: row?.progressiveMultiplier ?? 1,
    freeSpinBetAmount: row?.freeSpinBetAmount ?? 0,
  };
}

export async function saveBonusState(
  userId: string,
  gameId: string,
  state: BonusState
) {
  await prisma.slotBonusState.upsert({
    where: { userId_gameId: { userId, gameId } },
    create: {
      userId,
      gameId,
      freeSpinsLeft: state.freeSpinsLeft,
      multiplier: state.multiplier,
      progressiveMultiplier: state.progressiveMultiplier,
      freeSpinBetAmount: state.freeSpinBetAmount ?? 0,
    },
    update: {
      freeSpinsLeft: state.freeSpinsLeft,
      multiplier: state.multiplier,
      progressiveMultiplier: state.progressiveMultiplier,
      freeSpinBetAmount: state.freeSpinBetAmount ?? 0,
    },
  });
}
