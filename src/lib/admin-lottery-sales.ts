import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import { roundMoney } from "./cajero-banca-config";
import { betTypeLabel, type BetTypeCode } from "./bet-parser";
import { dedupeDrawsForDisplay } from "./results-sync";
import { dateKeyInTz, dayStartInTz, nowInTz, TZ } from "./timezone";

export type PaymentFilter = "ALL" | "WALLET" | "CASH";

export type AdminLotteryConfig = {
  code: string;
  name: string;
  category: string;
  drawTime: string;
  active: boolean;
};

export type AdminDrawSalesRow = {
  drawId: string;
  lotteryCode: string;
  lotteryName: string;
  drawTime: string;
  status: string;
  itemCount: number;
  ticketCount: number;
  totalSales: number;
  walletSales: number;
  cashSales: number;
  quinielaSales: number;
  paleSales: number;
  tripletaSales: number;
  superPaleSales: number;
  result: { first: string; second: string; third: string } | null;
};

export type AdminNumberSoldRow = {
  betType: BetTypeCode;
  betTypeLabel: string;
  numbers: string;
  plays: number;
  amount: number;
};

export type AdminQuinielaInventoryCell = {
  number: string;
  amount: number;
  plays: number;
};

export type AdminDrawInventory = {
  drawId: string;
  lotteryCode: string;
  lotteryName: string;
  drawTime: string;
  itemCount: number;
  totalSales: number;
  plays: AdminNumberSoldRow[];
  quinielaGrid: AdminQuinielaInventoryCell[];
};

export type AdminLotteryAccounting = {
  date: string;
  payment: PaymentFilter;
  lotteries: AdminLotteryConfig[];
  summary: {
    totalSales: number;
    totalItems: number;
    totalTickets: number;
    walletSales: number;
    cashSales: number;
    quinielaSales: number;
    paleSales: number;
    tripletaSales: number;
    superPaleSales: number;
  };
  draws: AdminDrawSalesRow[];
  /** Inventario completo del día por sorteo con ventas */
  drawInventories: AdminDrawInventory[];
  /** Todas las jugadas del día (consolidado) */
  globalInventory: AdminNumberSoldRow[];
  numberExposure: AdminNumberSoldRow[];
};

function parseReportDate(dateStr?: string): Date {
  const trimmed = (dateStr ?? dateKeyInTz(new Date())).trim();
  let key = dateKeyInTz(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    key = trimmed;
  } else {
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const [, mm, dd, yyyy] = slash;
      key = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return fromZonedTime(`${key}T00:00:00`, TZ);
}

function quinielaParts(numbers: string): string[] {
  return numbers
    .split(/[\s,+-]+/)
    .map((n) => n.replace(/\D/g, "").padStart(2, "0").slice(-2))
    .filter((n) => n.length === 2);
}

function exposureKey(betType: string, numbers: string): string {
  if (betType === "QUINIELA") {
    return quinielaParts(numbers)
      .sort()
      .map((n) => `Q:${n}`)
      .join("|");
  }
  return `${betType}:${numbers}`;
}

type ExposureEntry = {
  betType: BetTypeCode;
  numbers: string;
  plays: number;
  amount: number;
};

function addExposureEntry(
  map: Map<string, ExposureEntry>,
  item: { betType: string; numbers: string; amount: number }
) {
  const betType = item.betType as BetTypeCode;
  if (betType === "QUINIELA") {
    for (const num of quinielaParts(item.numbers)) {
      const key = `QUINIELA|${num}`;
      const exp = map.get(key) ?? { betType, numbers: num, plays: 0, amount: 0 };
      exp.plays += 1;
      exp.amount += item.amount;
      map.set(key, exp);
    }
    return;
  }
  const key = exposureKey(betType, item.numbers);
  const exp = map.get(key) ?? {
    betType,
    numbers: item.numbers,
    plays: 0,
    amount: 0,
  };
  exp.plays += 1;
  exp.amount += item.amount;
  map.set(key, exp);
}

function mapToSoldRows(map: Map<string, ExposureEntry>): AdminNumberSoldRow[] {
  return [...map.values()]
    .map((row) => ({
      betType: row.betType,
      betTypeLabel: betTypeLabel(row.betType),
      numbers: row.numbers,
      plays: row.plays,
      amount: roundMoney(row.amount),
    }))
    .sort((a, b) => b.amount - a.amount || b.plays - a.plays);
}

function quinielaGridFromMap(
  map: Map<string, ExposureEntry>
): AdminQuinielaInventoryCell[] {
  return [...map.values()]
    .filter((row) => row.betType === "QUINIELA")
    .map((row) => ({
      number: row.numbers,
      amount: roundMoney(row.amount),
      plays: row.plays,
    }))
    .sort((a, b) => b.amount - a.amount || a.number.localeCompare(b.number));
}

function addBetSales(
  totals: {
    quiniela: number;
    pale: number;
    tripleta: number;
    superPale: number;
  },
  betType: string,
  amount: number
) {
  switch (betType) {
    case "QUINIELA":
      totals.quiniela += amount;
      break;
    case "PALE":
      totals.pale += amount;
      break;
    case "TRIPLETA":
      totals.tripleta += amount;
      break;
    case "SUPER_PALE":
      totals.superPale += amount;
      break;
    default:
      break;
  }
}

export async function getAdminLotteryAccounting(options?: {
  date?: string;
  payment?: PaymentFilter;
  drawId?: string;
}): Promise<AdminLotteryAccounting> {
  const payment = options?.payment ?? "ALL";
  const dayStart = parseReportDate(options?.date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const date = dateKeyInTz(dayStart);

  const lotteries = await prisma.lottery.findMany({
    orderBy: [{ active: "desc" }, { drawTime: "asc" }],
    select: {
      code: true,
      name: true,
      category: true,
      drawTime: true,
      active: true,
    },
  });

  const rawDraws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(dayStart.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(dayStart.getTime() + 36 * 60 * 60 * 1000),
      },
    },
    include: {
      lottery: { select: { name: true, code: true } },
      result: true,
    },
    orderBy: { drawTime: "asc" },
  });
  const drawsForDay = dedupeDrawsForDisplay(rawDraws);

  const items = await prisma.ticketItem.findMany({
    where: {
      ...(options?.drawId ? { drawId: options.drawId } : {}),
      ticket: {
        status: { not: "CANCELED" },
        createdAt: { gte: dayStart, lt: dayEnd },
        ...(payment !== "ALL" ? { paymentMethod: payment } : {}),
      },
    },
    include: {
      ticket: { select: { id: true, paymentMethod: true } },
      draw: { include: { lottery: true, result: true } },
    },
  });

  const drawAgg = new Map<
    string,
    {
      drawId: string;
      lotteryCode: string;
      lotteryName: string;
      drawTime: string;
      status: string;
      result: AdminDrawSalesRow["result"];
      itemCount: number;
      ticketIds: Set<string>;
      totalSales: number;
      walletSales: number;
      cashSales: number;
      quinielaSales: number;
      paleSales: number;
      tripletaSales: number;
      superPaleSales: number;
    }
  >();

  for (const draw of drawsForDay) {
    drawAgg.set(draw.id, {
      drawId: draw.id,
      lotteryCode: draw.lottery.code,
      lotteryName: draw.lottery.name,
      drawTime: draw.drawTime,
      status: draw.status,
      result: draw.result
        ? {
            first: draw.result.first,
            second: draw.result.second,
            third: draw.result.third,
          }
        : null,
      itemCount: 0,
      ticketIds: new Set(),
      totalSales: 0,
      walletSales: 0,
      cashSales: 0,
      quinielaSales: 0,
      paleSales: 0,
      tripletaSales: 0,
      superPaleSales: 0,
    });
  }

  const summaryTotals = {
    totalSales: 0,
    totalItems: 0,
    ticketIds: new Set<string>(),
    walletSales: 0,
    cashSales: 0,
    quiniela: 0,
    pale: 0,
    tripleta: 0,
    superPale: 0,
  };

  const globalExposureMap = new Map<string, ExposureEntry>();
  const perDrawExposure = new Map<string, Map<string, ExposureEntry>>();
  const filterDrawId = options?.drawId;

  for (const item of items) {
    const drawId = item.drawId;
    let row = drawAgg.get(drawId);
    if (!row) {
      row = {
        drawId,
        lotteryCode: item.draw.lottery.code,
        lotteryName: item.lotteryName || item.draw.lottery.name,
        drawTime: item.draw.drawTime,
        status: item.draw.status,
        result: item.draw.result
          ? {
              first: item.draw.result.first,
              second: item.draw.result.second,
              third: item.draw.result.third,
            }
          : null,
        itemCount: 0,
        ticketIds: new Set(),
        totalSales: 0,
        walletSales: 0,
        cashSales: 0,
        quinielaSales: 0,
        paleSales: 0,
        tripletaSales: 0,
        superPaleSales: 0,
      };
      drawAgg.set(drawId, row);
    }

    row.itemCount += 1;
    row.ticketIds.add(item.ticketId);
    row.totalSales += item.amount;
    summaryTotals.totalItems += 1;
    summaryTotals.totalSales += item.amount;
    summaryTotals.ticketIds.add(item.ticketId);

    if (item.ticket.paymentMethod === "CASH") {
      row.cashSales += item.amount;
      summaryTotals.cashSales += item.amount;
    } else {
      row.walletSales += item.amount;
      summaryTotals.walletSales += item.amount;
    }

    if (item.betType === "QUINIELA") row.quinielaSales += item.amount;
    else if (item.betType === "PALE") row.paleSales += item.amount;
    else if (item.betType === "TRIPLETA") row.tripletaSales += item.amount;
    else if (item.betType === "SUPER_PALE") row.superPaleSales += item.amount;

    addBetSales(summaryTotals, item.betType, item.amount);

    addExposureEntry(globalExposureMap, item);

    if (!perDrawExposure.has(drawId)) {
      perDrawExposure.set(drawId, new Map());
    }
    addExposureEntry(perDrawExposure.get(drawId)!, item);
  }

  const draws: AdminDrawSalesRow[] = [...drawAgg.values()]
    .map((row) => ({
      drawId: row.drawId,
      lotteryCode: row.lotteryCode,
      lotteryName: row.lotteryName,
      drawTime: row.drawTime,
      status: row.status,
      itemCount: row.itemCount,
      ticketCount: row.ticketIds.size,
      totalSales: roundMoney(row.totalSales),
      walletSales: roundMoney(row.walletSales),
      cashSales: roundMoney(row.cashSales),
      quinielaSales: roundMoney(row.quinielaSales),
      paleSales: roundMoney(row.paleSales),
      tripletaSales: roundMoney(row.tripletaSales),
      superPaleSales: roundMoney(row.superPaleSales),
      result: row.result,
    }))
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime));

  const globalInventory = mapToSoldRows(globalExposureMap);

  const drawInventories: AdminDrawInventory[] = [...drawAgg.values()]
    .filter((row) => row.itemCount > 0)
    .map((row) => {
      const drawMap = perDrawExposure.get(row.drawId) ?? new Map();
      return {
        drawId: row.drawId,
        lotteryCode: row.lotteryCode,
        lotteryName: row.lotteryName,
        drawTime: row.drawTime,
        itemCount: row.itemCount,
        totalSales: roundMoney(row.totalSales),
        plays: mapToSoldRows(drawMap),
        quinielaGrid: quinielaGridFromMap(drawMap),
      };
    })
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime));

  const numberExposure = filterDrawId
    ? mapToSoldRows(perDrawExposure.get(filterDrawId) ?? new Map())
    : [];

  return {
    date,
    payment,
    lotteries: lotteries.map((l) => ({
      code: l.code,
      name: l.name,
      category: l.category,
      drawTime: l.drawTime,
      active: l.active,
    })),
    summary: {
      totalSales: roundMoney(summaryTotals.totalSales),
      totalItems: summaryTotals.totalItems,
      totalTickets: summaryTotals.ticketIds.size,
      walletSales: roundMoney(summaryTotals.walletSales),
      cashSales: roundMoney(summaryTotals.cashSales),
      quinielaSales: roundMoney(summaryTotals.quiniela),
      paleSales: roundMoney(summaryTotals.pale),
      tripletaSales: roundMoney(summaryTotals.tripleta),
      superPaleSales: roundMoney(summaryTotals.superPale),
    },
    draws,
    drawInventories,
    globalInventory,
    numberExposure,
  };
}

export function defaultAccountingDate(): string {
  return dateKeyInTz(nowInTz());
}
