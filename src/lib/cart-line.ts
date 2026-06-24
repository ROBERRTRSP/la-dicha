import type { BetTypeCode } from "./bet-parser";

export type CartLine = {
  id: string;
  betType: BetTypeCode;
  numbers: string;
  digits: string;
  amount: number;
  drawIds: string[];
  lotteryNames: string[];
  lotteryCodes?: string[];
  superPaleCode?: string;
  superPaleName?: string;
  superPaleLotCodes?: [string, string];
  addedAt: number;
};

export function cartLineTotal(line: CartLine) {
  if (line.betType === "SUPER_PALE" || line.superPaleCode) {
    return line.amount;
  }
  return line.amount * line.drawIds.length;
}

export function cartLineUnitCount(line: CartLine) {
  if (line.betType === "SUPER_PALE" || line.superPaleCode) return 1;
  return line.drawIds.length;
}

export function isMultiLotteryLine(line: CartLine) {
  return cartLineUnitCount(line) > 1;
}
