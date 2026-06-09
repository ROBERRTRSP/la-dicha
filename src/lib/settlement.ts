import { prisma } from "./db";
import type { BetTypeCode } from "./bet-parser";

const MULT = {
  QUINIELA_1: 56,
  QUINIELA_2: 12,
  QUINIELA_3: 4,
  PALE: 1300,
  TRIPLETA: 10000,
  SUPER_PALE: 1300,
} as const;

function parseNums(numbers: string): string[] {
  return numbers.split("-").map((n) => n.padStart(2, "0"));
}

export function calcItemPrize(
  betType: BetTypeCode,
  numbers: string,
  amount: number,
  first: string,
  second: string,
  third: string
): number {
  const wins = [first.padStart(2, "0"), second.padStart(2, "0"), third.padStart(2, "0")];

  if (betType === "QUINIELA") {
    const n = numbers.padStart(2, "0");
    if (wins[0] === n) return amount * MULT.QUINIELA_1;
    if (wins[1] === n) return amount * MULT.QUINIELA_2;
    if (wins[2] === n) return amount * MULT.QUINIELA_3;
    return 0;
  }

  const picks = parseNums(numbers);
  if (betType === "PALE" || betType === "SUPER_PALE") {
    if (picks.length >= 2 && picks.every((p) => wins.includes(p))) {
      return amount * MULT.PALE;
    }
    return 0;
  }

  if (betType === "TRIPLETA") {
    if (picks.length >= 3 && picks.every((p) => wins.includes(p))) {
      return amount * MULT.TRIPLETA;
    }
    return 0;
  }

  return 0;
}

export async function settleDraw(drawId: string) {
  const result = await prisma.result.findUnique({ where: { drawId } });
  if (!result) throw new Error("Publica el resultado antes de liquidar.");

  const items = await prisma.ticketItem.findMany({
    where: { drawId, status: "PENDING" },
    include: { ticket: true },
  });

  const ticketIds = new Set<string>();

  for (const item of items) {
    const prize = calcItemPrize(
      item.betType as BetTypeCode,
      item.numbers,
      item.amount,
      result.first,
      result.second,
      result.third
    );
    await prisma.ticketItem.update({
      where: { id: item.id },
      data: {
        status: prize > 0 ? "WINNER" : "LOSER",
        prizeAmount: prize,
      },
    });
    ticketIds.add(item.ticketId);
  }

  for (const ticketId of ticketIds) {
    const all = await prisma.ticketItem.findMany({ where: { ticketId } });
    const hasPending = all.some((i) => i.status === "PENDING");
    if (hasPending) continue;
    const hasWinner = all.some((i) => i.status === "WINNER");
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: hasWinner ? "WINNER" : "LOSER" },
    });
  }

  await prisma.draw.update({
    where: { id: drawId },
    data: { status: "RESULT_AVAILABLE" },
  });

  return { settled: items.length };
}
