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

export function allowedBetOptionsForGame(
  gameId: string,
  min: number,
  max: number
): readonly number[] {
  return betOptionsForGame(gameId).filter((n) => n >= min && n <= max);
}

export function validateSlotBet(
  amount: number,
  min: number,
  max: number,
  gameId?: string
) {
  const options = allowedBetOptionsForGame(gameId ?? "", min, max);
  const valid = options.includes(amount);
  if (!valid) {
    const hint = options.length
      ? options.map((n) => n.toFixed(0)).join(", ")
      : "ninguna dentro del límite";
    throw new Error(
      `Apuesta no válida. Montos permitidos: ${hint} (máx. ${max.toFixed(2)}).`
    );
  }
  if (amount < min || amount > max) {
    throw new Error(`Apuesta entre ${min.toFixed(2)} y ${max.toFixed(2)}.`);
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
