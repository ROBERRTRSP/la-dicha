import type { BetTypeCode } from "./bet-parser";
import { generateId } from "./generate-id";
import type { CartLine } from "./cart-line";
import {
  getSuperPaleDefinition,
  type OpenSuperPaleView,
} from "./super-pale";

type TicketItemLike = {
  drawId: string;
  lotteryName: string;
  betType: BetTypeCode | string;
  numbers: string;
  amount: number;
  superPaleName?: string | null;
};

function numbersToDigits(betType: string, numbers: string): string {
  if (betType === "QUINIELA") return numbers.replace(/\D/g, "");
  return numbers.replace(/-/g, "");
}

function buildSuperPaleCartLine(
  item: TicketItemLike,
  openSuperPales?: OpenSuperPaleView[]
): CartLine {
  const codeRaw = item.superPaleName ?? "";
  const def = getSuperPaleDefinition(codeRaw);
  const superPaleCode = def?.code ?? codeRaw;
  const sp = openSuperPales?.find((s) => s.code === superPaleCode);

  return {
    id: generateId(),
    betType: "SUPER_PALE",
    digits: numbersToDigits("SUPER_PALE", item.numbers),
    numbers: item.numbers,
    amount: item.amount,
    drawIds: sp ? [sp.drawIdA, sp.drawIdB] : [item.drawId],
    lotteryNames: sp
      ? [sp.lotteryNameA, sp.lotteryNameB]
      : [item.lotteryName],
    lotteryCodes: sp ? [sp.lotteryCodeA, sp.lotteryCodeB] : undefined,
    superPaleCode,
    superPaleName: def?.name ?? item.lotteryName,
    superPaleLotCodes: sp
      ? [sp.lotteryCodeA, sp.lotteryCodeB]
      : undefined,
    addedAt: Date.now(),
  };
}

/** Reconstruye líneas del carrito desde items de un ticket existente */
export function ticketItemsToCartLines(
  items: TicketItemLike[],
  openSuperPales?: OpenSuperPaleView[]
): CartLine[] {
  const map = new Map<string, CartLine>();

  for (const item of items) {
    if (item.betType === "SUPER_PALE" || item.superPaleName) {
      const codeRaw = item.superPaleName ?? "";
      const def = getSuperPaleDefinition(codeRaw);
      const superPaleCode = def?.code ?? codeRaw;
      const key = `SUPER_PALE|${item.numbers}|${item.amount}|${superPaleCode}`;
      if (!map.has(key)) {
        map.set(key, buildSuperPaleCartLine(item, openSuperPales));
      }
      continue;
    }

    const key = `${item.betType}|${item.numbers}|${item.amount}`;
    if (!map.has(key)) {
      map.set(key, {
        id: generateId(),
        betType: item.betType as BetTypeCode,
        digits: numbersToDigits(item.betType, item.numbers),
        numbers: item.numbers,
        amount: item.amount,
        drawIds: [],
        lotteryNames: [],
        addedAt: Date.now(),
      });
    }
    const line = map.get(key)!;
    if (!line.drawIds.includes(item.drawId)) {
      line.drawIds.push(item.drawId);
      line.lotteryNames.push(item.lotteryName);
    }
  }

  return [...map.values()];
}

export const REPEAT_CART_KEY = "la-dicha-repeat-cart";
