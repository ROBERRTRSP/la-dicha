import type { BetTypeCode } from "./bet-parser";
import { generateId } from "./generate-id";
import type { CartLine } from "./tickets";

type TicketItemLike = {
  drawId: string;
  lotteryName: string;
  betType: BetTypeCode | string;
  numbers: string;
  amount: number;
};

function numbersToDigits(betType: string, numbers: string): string {
  if (betType === "QUINIELA") return numbers.replace(/\D/g, "");
  return numbers.replace(/-/g, "");
}

/** Reconstruye líneas del carrito desde items de un ticket existente */
export function ticketItemsToCartLines(items: TicketItemLike[]): CartLine[] {
  const map = new Map<string, CartLine>();

  for (const item of items) {
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
