import { prisma } from "./db";
import type { BetTypeCode } from "./bet-parser";
import { getSuperPaleDefinition } from "./super-pale";
import { dateKeyInTz } from "./timezone";

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

function winsInclude(num: string, wins: string[]) {
  return wins.includes(num.padStart(2, "0"));
}

export function calcSuperPalePrize(
  numbers: string,
  amount: number,
  winsA: string[],
  winsB: string[]
): number {
  const picks = parseNums(numbers);
  if (picks.length < 2) return 0;
  const [a, b] = picks;
  const hit =
    (winsInclude(a, winsA) && winsInclude(b, winsB)) ||
    (winsInclude(a, winsB) && winsInclude(b, winsA));
  return hit ? amount * MULT.SUPER_PALE : 0;
}

async function settlePendingSuperPaleItems() {
  const pending = await prisma.ticketItem.findMany({
    where: { betType: "SUPER_PALE", status: "PENDING" },
    include: { draw: true },
  });

  const ticketIds = new Set<string>();

  for (const item of pending) {
    const code = item.superPaleName;
    const def = code ? getSuperPaleDefinition(code) : undefined;
    if (!def) continue;

    const dayKey = dateKeyInTz(item.draw.drawDate);
    const draws = await prisma.draw.findMany({
      where: {
        lottery: { code: { in: [def.lotteryCodeA, def.lotteryCodeB] } },
      },
      include: { result: true, lottery: true },
    });

    const dayDraws = draws.filter((d) => dateKeyInTz(d.drawDate) === dayKey);
    const drawA = dayDraws.find((d) => d.lottery.code === def.lotteryCodeA);
    const drawB = dayDraws.find((d) => d.lottery.code === def.lotteryCodeB);
    if (!drawA?.result || !drawB?.result) continue;

    const winsA = [drawA.result.first, drawA.result.second, drawA.result.third];
    const winsB = [drawB.result.first, drawB.result.second, drawB.result.third];
    const prize = calcSuperPalePrize(item.numbers, item.amount, winsA, winsB);

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

  return pending.length;
}

export async function settleDraw(drawId: string) {
  const result = await prisma.result.findUnique({ where: { drawId } });
  if (!result) throw new Error("Publica el resultado antes de liquidar.");

  const items = await prisma.ticketItem.findMany({
    where: { drawId, status: "PENDING", betType: { not: "SUPER_PALE" } },
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

  await settlePendingSuperPaleItems();

  return { settled: items.length };
}
