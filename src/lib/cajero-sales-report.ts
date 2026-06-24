import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import {
  commissionRateForLottery,
  roundMoney,
} from "./cajero-banca-config";
import { getBancaSettings } from "./banca-session";
import { dateKeyInTz, TZ } from "./timezone";

export type SalesReportDrawRow = {
  lotteryCode: string;
  lotteryName: string;
  sales: number;
  commission: number;
  prizes: number;
  net: number;
};

export type SalesReportWinnerTicket = {
  createdAt: string;
  ticketNumber: string;
  toPay: number;
  paid: number;
};

export type SalesReportWinnerNumber = {
  lotteryCode: string;
  lotteryName: string;
  shortLabel: string;
  first: string;
  second: string;
  third: string;
};

export type CajeroSalesReport = {
  date: string;
  bancaName: string;
  terminalCode: string;
  balanceAtDate: number;
  pendingAmount: number;
  pendingCount: number;
  losersCount: number;
  winnersCount: number;
  totalTickets: number;
  openingBalance: number;
  sales: number;
  commissions: number;
  prizes: number;
  net: number;
  finalBalance: number;
  balance: number;
  draws: SalesReportDrawRow[];
  winnerTickets: SalesReportWinnerTicket[];
  winnerNumbers: SalesReportWinnerNumber[];
  recentSales: {
    ticketNumber: string;
    totalAmount: number;
    customerName: string | null;
    createdAt: string;
  }[];
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

function shortDrawLabel(name: string, drawTime: string): string {
  const n = name.toUpperCase();
  if (n.includes("ANGUILA")) {
    const h = drawTime.slice(0, 2);
    return `AG ${h === "10" ? "AM" : h === "13" ? "1PM" : h === "18" ? "6PM" : h === "21" ? "9PM" : drawTime}`;
  }
  if (n.includes("NEW YORK")) return drawTime < "18:00" ? "NY AM" : "NY PM";
  if (n.includes("FLORIDA")) return drawTime < "18:00" ? "FL AM" : "FL PM";
  if (n.includes("KING")) return drawTime < "18:00" ? "KING AM" : "KING PM";
  return name.length > 18 ? name.slice(0, 18) : name;
}

const cashTicketWhere = (dayStart: Date, dayEnd: Date) => ({
  paymentMethod: "CASH" as const,
  createdAt: { gte: dayStart, lt: dayEnd },
  status: { not: "CANCELED" as const },
});

export async function getCajeroSalesReport(
  dateStr?: string
): Promise<CajeroSalesReport> {
  const dayStart = parseReportDate(dateStr);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const date = dateKeyInTz(dayStart);

  const tickets = await prisma.ticket.findMany({
    where: cashTicketWhere(dayStart, dayEnd),
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          draw: { include: { lottery: true, result: true } },
        },
      },
    },
  });

  const drawMap = new Map<
    string,
    { code: string; name: string; sales: number; prizes: number }
  >();

  let pendingAmount = 0;
  let pendingCount = 0;
  let losersCount = 0;
  let winnersCount = 0;
  let totalPrizes = 0;

  for (const ticket of tickets) {
    switch (ticket.status) {
      case "ACTIVE":
        pendingCount += 1;
        pendingAmount += ticket.totalAmount;
        break;
      case "LOSER":
        losersCount += 1;
        break;
      case "WINNER":
      case "PAID":
        winnersCount += 1;
        break;
      default:
        break;
    }

    for (const item of ticket.items) {
      const code = item.draw.lottery.code;
      const name = item.lotteryName || item.draw.lottery.name;
      const key = `${code}|${name}`;
      const row = drawMap.get(key) ?? {
        code,
        name,
        sales: 0,
        prizes: 0,
      };
      row.sales += item.amount;
      if (item.prizeAmount && item.prizeAmount > 0) {
        row.prizes += item.prizeAmount;
        totalPrizes += item.prizeAmount;
      }
      drawMap.set(key, row);
    }
  }

  const draws: SalesReportDrawRow[] = [...drawMap.values()]
    .map((row) => {
      const rate = commissionRateForLottery(row.code);
      const commission = roundMoney(row.sales * rate);
      const net = roundMoney(row.sales - commission - row.prizes);
      return {
        lotteryCode: row.code,
        lotteryName: row.name,
        sales: roundMoney(row.sales),
        commission,
        prizes: roundMoney(row.prizes),
        net,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const sales = roundMoney(draws.reduce((s, d) => s + d.sales, 0));
  const commissions = roundMoney(draws.reduce((s, d) => s + d.commission, 0));
  const prizes = roundMoney(totalPrizes);
  const net = roundMoney(sales - commissions - prizes);

  const settings = await getBancaSettings();
  const session = await prisma.bancaDaySession.findUnique({
    where: {
      terminalCode_sessionDate: {
        terminalCode: settings.terminalCode,
        sessionDate: date,
      },
    },
  });
  const openingBalance = session?.openingBalance ?? settings.defaultOpeningBalance;
  const finalBalance = roundMoney(openingBalance + net);
  const balance = session?.currentBalance ?? finalBalance;

  const winnerTickets: SalesReportWinnerTicket[] = tickets
    .filter((t) => t.status === "WINNER" || t.status === "PAID")
    .map((t) => {
      const toPay = t.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0);
      return {
        createdAt: t.createdAt.toISOString(),
        ticketNumber: t.ticketNumber,
        toPay: roundMoney(toPay),
        paid: t.status === "PAID" ? roundMoney(toPay) : 0,
      };
    })
    .filter((t) => t.toPay > 0);

  const resultsSeen = new Set<string>();
  const winnerNumbers: SalesReportWinnerNumber[] = [];
  for (const ticket of tickets) {
    for (const item of ticket.items) {
      const draw = item.draw;
      const result = draw.result;
      if (!result?.confirmed || resultsSeen.has(draw.id)) continue;
      resultsSeen.add(draw.id);
      winnerNumbers.push({
        lotteryCode: draw.lottery.code,
        lotteryName: draw.lottery.name,
        shortLabel: shortDrawLabel(draw.lottery.name, draw.drawTime),
        first: result.first,
        second: result.second,
        third: result.third,
      });
    }
  }

  winnerNumbers.sort((a, b) => a.lotteryName.localeCompare(b.lotteryName));

  return {
    date,
    bancaName: settings.bancaName,
    terminalCode: settings.terminalCode,
    balanceAtDate: openingBalance,
    pendingAmount: roundMoney(pendingAmount),
    pendingCount,
    losersCount,
    winnersCount,
    totalTickets: tickets.length,
    openingBalance,
    sales,
    commissions,
    prizes,
    net,
    finalBalance,
    balance,
    draws,
    winnerTickets,
    winnerNumbers,
    recentSales: tickets.slice(0, 40).map((t) => ({
      ticketNumber: t.ticketNumber,
      totalAmount: t.totalAmount,
      customerName: t.customerName,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
