import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CartLine } from "./cart-line";
import { dayStartInTz } from "./timezone";

import type { PlayLimitContext } from "./play-limit-context";
import { resolvePlayLimit } from "./play-limit-context";
import { formatMoney } from "./utils";

export type PlayLimitBetType = "QUINIELA" | "PALE" | "TRIPLETA" | "SUPER_PALE";

export type PlayLimitSettings = {
  maxDirectoPerNumber: number;
  maxPalePerNumber: number;
  maxTripletaPerNumber: number;
  maxSuperPalePerNumber: number;
};

export type SoldPlayItem = {
  drawId: string;
  betType: string;
  numbers: string;
  amount: number;
  superPaleName?: string | null;
  lotteryName?: string;
};

export type PlayLimitInfo = {
  number: string;
  drawId: string;
  lotteryId: string;
  lotteryName: string;
  playType: PlayLimitBetType;
  playTypeLabel: string;
  limit: number;
  sold: number;
  available: number;
  canPlay: boolean;
  message?: string;
};

export type PlayLimitValidation = {
  ok: boolean;
  items: PlayLimitInfo[];
  blockMessage?: string;
};

const LIMIT_BET_TYPES: PlayLimitBetType[] = [
  "QUINIELA",
  "PALE",
  "TRIPLETA",
  "SUPER_PALE",
];

export function playTypeLabel(type: PlayLimitBetType): string {
  const labels: Record<PlayLimitBetType, string> = {
    QUINIELA: "Directo",
    PALE: "Palé",
    TRIPLETA: "Tripleta",
    SUPER_PALE: "Súper Palé",
  };
  return labels[type];
}

export function limitForBetType(
  settings: PlayLimitSettings,
  betType: PlayLimitBetType
): number {
  switch (betType) {
    case "QUINIELA":
      return settings.maxDirectoPerNumber;
    case "PALE":
      return settings.maxPalePerNumber;
    case "TRIPLETA":
      return settings.maxTripletaPerNumber;
    case "SUPER_PALE":
      return settings.maxSuperPalePerNumber;
    default:
      return settings.maxDirectoPerNumber;
  }
}

export function quinielaNumberKeys(numbers: string): string[] {
  return numbers
    .split(/[\s,+-]+/)
    .map((n) => n.replace(/\D/g, "").padStart(2, "0").slice(-2))
    .filter((n) => n.length === 2);
}

export function extractLimitKeys(
  betType: PlayLimitBetType,
  numbers: string
): string[] {
  if (betType === "QUINIELA") {
    const keys = quinielaNumberKeys(numbers);
    return keys.length > 0 ? keys : [];
  }
  const normalized = numbers.replace(/\s+/g, "").trim();
  return normalized ? [normalized] : [];
}

export function displayNumberForKey(
  betType: PlayLimitBetType,
  key: string
): string {
  if (betType === "QUINIELA") return key;
  return key;
}

function soldKeysForItem(item: SoldPlayItem): string[] {
  const betType = item.betType as PlayLimitBetType;
  if (!LIMIT_BET_TYPES.includes(betType)) return [];

  if (betType === "SUPER_PALE" && item.superPaleName) {
    for (const key of extractLimitKeys(betType, item.numbers)) {
      return [`SUPER_PALE|${item.superPaleName}|${key}`];
    }
    return [];
  }

  return extractLimitKeys(betType, item.numbers).map(
    (key) => `${item.drawId}|${betType}|${key}`
  );
}

function soldKeysForCartLine(line: CartLine): string[] {
  const betType = (
    line.betType === "SUPER_PALE" || line.superPaleCode
      ? "SUPER_PALE"
      : line.betType
  ) as PlayLimitBetType;

  if (!LIMIT_BET_TYPES.includes(betType)) return [];

  if (betType === "SUPER_PALE" && line.superPaleCode) {
    return extractLimitKeys(betType, line.numbers).map(
      (key) => `SUPER_PALE|${line.superPaleCode}|${key}`
    );
  }

  const keys: string[] = [];
  for (const drawId of line.drawIds) {
    for (const key of extractLimitKeys(betType, line.numbers)) {
      keys.push(`${drawId}|${betType}|${key}`);
    }
  }
  return keys;
}

export function buildSoldAmountMap(
  items: SoldPlayItem[],
  cartLines: CartLine[] = []
): Map<string, number> {
  const map = new Map<string, number>();

  const add = (keys: string[], amount: number) => {
    for (const key of keys) {
      map.set(key, (map.get(key) ?? 0) + amount);
    }
  };

  for (const item of items) {
    add(soldKeysForItem(item), item.amount);
  }
  for (const line of cartLines) {
    add(soldKeysForCartLine(line), line.amount);
  }

  return map;
}

export async function fetchTodaySoldPlayItems(
  tx?: Prisma.TransactionClient,
  drawIds?: string[]
): Promise<SoldPlayItem[]> {
  const client = tx ?? prisma;
  const todayStart = dayStartInTz();

  return client.ticketItem.findMany({
    where: {
      betType: { in: LIMIT_BET_TYPES },
      ticket: {
        paymentMethod: "CASH",
        status: "ACTIVE",
        createdAt: { gte: todayStart },
      },
      ...(drawIds?.length ? { drawId: { in: drawIds } } : {}),
    },
    select: {
      drawId: true,
      betType: true,
      numbers: true,
      amount: true,
      superPaleName: true,
      lotteryName: true,
    },
  });
}

function resolveLineMeta(
  line: CartLine,
  drawIndex: number
): {
  drawId: string;
  lotteryId: string;
  lotteryName: string;
  betType: PlayLimitBetType;
  superPaleCode?: string;
} {
  const betType = (
    line.betType === "SUPER_PALE" || line.superPaleCode
      ? "SUPER_PALE"
      : line.betType
  ) as PlayLimitBetType;

  if (betType === "SUPER_PALE" && line.superPaleCode) {
    return {
      drawId: line.drawIds[0] ?? "",
      lotteryId: line.superPaleCode,
      lotteryName: line.superPaleName ?? line.superPaleCode,
      betType,
      superPaleCode: line.superPaleCode,
    };
  }

  return {
    drawId: line.drawIds[drawIndex] ?? line.drawIds[0] ?? "",
    lotteryId: line.lotteryCodes?.[drawIndex] ?? line.drawIds[drawIndex] ?? "",
    lotteryName:
      line.lotteryNames?.[drawIndex] ?? line.lotteryNames?.[0] ?? "Lotería",
    betType,
  };
}

function soldKeyForCheck(
  betType: PlayLimitBetType,
  numberKey: string,
  drawId: string,
  superPaleCode?: string
): string {
  if (betType === "SUPER_PALE" && superPaleCode) {
    return `SUPER_PALE|${superPaleCode}|${numberKey}`;
  }
  return `${drawId}|${betType}|${numberKey}`;
}

function blockMessageFor(
  number: string,
  lotteryName: string,
  available: number,
  amount: number,
  multi = false
): string {
  if (amount > 0 && available >= 0 && amount > available) {
    return formatAmountExceedsLimitMessage(number, available, amount);
  }
  if (multi) {
    return `El número ${number} excede el límite en ${lotteryName}. Disponible: ${formatMoney(available)}.`;
  }
  return `El número ${number} solo tiene ${formatMoney(available)} disponibles en esta lotería. Reduzca el monto o seleccione otra lotería.`;
}

/** Mensaje cuando el monto digitado supera el disponible del número. */
export function formatAmountExceedsLimitMessage(
  number: string,
  available: number,
  amount: number
): string {
  return `El número ${number} solo tiene ${formatMoney(available)} disponibles. El monto ${formatMoney(amount)} excede el límite permitido.`;
}

export function validatePlayLimitsForLines(
  pendingLines: CartLine[],
  cartLines: CartLine[],
  ctx: PlayLimitContext,
  soldItems: SoldPlayItem[]
): PlayLimitValidation {
  const soldMap = buildSoldAmountMap(soldItems, cartLines);
  const items: PlayLimitInfo[] = [];
  let blockMessage: string | undefined;

  for (const line of pendingLines) {
    const betType = (
      line.betType === "SUPER_PALE" || line.superPaleCode
        ? "SUPER_PALE"
        : line.betType
    ) as PlayLimitBetType;

    if (!LIMIT_BET_TYPES.includes(betType)) continue;

    const numberKeys = extractLimitKeys(betType, line.numbers);

    if (betType === "SUPER_PALE" && line.superPaleCode) {
      const limit = resolvePlayLimit(ctx, betType, line.superPaleCode);
      for (const numberKey of numberKeys) {
        const key = soldKeyForCheck(
          betType,
          numberKey,
          line.drawIds[0] ?? "",
          line.superPaleCode
        );
        const sold = soldMap.get(key) ?? 0;
        const available = Math.max(0, limit - sold);
        const canPlay = line.amount <= available + 1e-9;
        const number = displayNumberForKey(betType, numberKey);
        const info: PlayLimitInfo = {
          number,
          drawId: line.drawIds[0] ?? "",
          lotteryId: line.superPaleCode,
          lotteryName: line.superPaleName ?? line.superPaleCode,
          playType: betType,
          playTypeLabel: playTypeLabel(betType),
          limit,
          sold,
          available,
          canPlay,
          message: canPlay
            ? undefined
            : available <= 0
              ? `El número ${number} ya alcanzó el límite permitido en ${line.superPaleName ?? "Súper Palé"}.`
              : formatAmountExceedsLimitMessage(number, available, line.amount),
        };
        items.push(info);
        if (!canPlay && !blockMessage) {
          blockMessage = blockMessageFor(
            number,
            info.lotteryName,
            available,
            line.amount,
            true
          );
        }
        soldMap.set(key, sold + line.amount);
      }
      continue;
    }

    for (let i = 0; i < line.drawIds.length; i++) {
      const meta = resolveLineMeta(line, i);
      const limit = resolvePlayLimit(ctx, betType, meta.lotteryId);
      for (const numberKey of numberKeys) {
        const key = soldKeyForCheck(betType, numberKey, meta.drawId);
        const sold = soldMap.get(key) ?? 0;
        const available = Math.max(0, limit - sold);
        const canPlay = line.amount <= available + 1e-9;
        const number = displayNumberForKey(betType, numberKey);
        const info: PlayLimitInfo = {
          number,
          drawId: meta.drawId,
          lotteryId: meta.lotteryId,
          lotteryName: meta.lotteryName,
          playType: betType,
          playTypeLabel: playTypeLabel(betType),
          limit,
          sold,
          available,
          canPlay,
          message: canPlay
            ? undefined
            : available <= 0
              ? `El número ${number} ya alcanzó el límite permitido.`
              : formatAmountExceedsLimitMessage(number, available, line.amount),
        };
        items.push(info);
        if (!canPlay && !blockMessage) {
          blockMessage =
            line.drawIds.length > 1
              ? blockMessageFor(
                  number,
                  meta.lotteryName,
                  available,
                  line.amount,
                  true
                )
              : blockMessageFor(
                  number,
                  meta.lotteryName,
                  available,
                  line.amount
                );
        }
        soldMap.set(key, sold + line.amount);
      }
    }
  }

  return {
    ok: !blockMessage,
    items,
    blockMessage,
  };
}

export function buildPlayLimitPreview(
  betType: PlayLimitBetType,
  number: string,
  amount: number,
  targets: {
    drawId: string;
    lotteryId: string;
    lotteryName: string;
    superPaleCode?: string;
  }[],
  ctx: PlayLimitContext,
  soldMap: Map<string, number>
): PlayLimitInfo[] {
  const numberKeys = extractLimitKeys(betType, number);
  if (numberKeys.length === 0) return [];

  const out: PlayLimitInfo[] = [];

  for (const target of targets) {
    const lotteryCode = target.superPaleCode ?? target.lotteryId;
    const limit = resolvePlayLimit(ctx, betType, lotteryCode);
    for (const numberKey of numberKeys) {
      const key = soldKeyForCheck(
        betType,
        numberKey,
        target.drawId,
        target.superPaleCode
      );
      const sold = soldMap.get(key) ?? 0;
      const available = Math.max(0, limit - sold);
      const displayNum = displayNumberForKey(betType, numberKey);
      out.push({
        number: displayNum,
        drawId: target.drawId,
        lotteryId: target.superPaleCode ?? target.lotteryId,
        lotteryName: target.lotteryName,
        playType: betType,
        playTypeLabel: playTypeLabel(betType),
        limit,
        sold,
        available,
        canPlay: amount <= available + 1e-9,
        message:
          amount > 0 && amount > available
            ? available <= 0
              ? `El número ${displayNum} ya alcanzó el límite permitido.`
              : formatAmountExceedsLimitMessage(displayNum, available, amount)
            : undefined,
      });
    }
  }

  return out;
}

export function playLimitsBlockMessage(
  validation: PlayLimitValidation
): string | null {
  return validation.blockMessage ?? null;
}
