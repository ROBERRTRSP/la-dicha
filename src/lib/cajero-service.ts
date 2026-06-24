import { prisma } from "./db";
import { generateTicketQrDataUrl } from "./ticket-qr";
import { buildTicketSearchQueries, getQrTicketCode } from "./ticket-codes";
import { hashPassword } from "./auth";
import { buildReceiptData } from "./build-receipt-data";
import type { ReceiptData } from "./ticket-receipt";
import { canCancelTicketForCajero } from "./tickets";
import { dayStartInTz } from "./timezone";
import { formatMoney } from "./utils";

export async function createPlayerAccount(input: {
  username: string;
  fullName: string;
  phone?: string;
  password?: string;
  initialBalance?: number;
}) {
  const username = input.username.toLowerCase().trim();
  if (!username || username.length < 3) {
    throw new Error("Usuario inválido (mínimo 3 caracteres).");
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) throw new Error("Ese usuario ya existe.");

  const passwordHash = await hashPassword(input.password ?? "1234");
  const balance = input.initialBalance ?? 0;

  const user = await prisma.user.create({
    data: {
      username,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      passwordHash,
      role: "JUGADOR",
      wallet: {
        create: { balance },
      },
    },
    include: { wallet: true },
  });

  if (balance > 0 && user.wallet) {
    await prisma.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        type: "DEPOSIT",
        amount: balance,
        balanceBefore: 0,
        balanceAfter: balance,
        note: "Saldo inicial — cajero",
      },
    });
  }

  return user;
}

export async function adjustPlayerWallet(
  playerId: string,
  amount: number,
  mode: "add" | "subtract",
  note?: string
) {
  const amt = Math.round(Math.abs(Number(amount)) * 100) / 100;
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("El monto debe ser mayor a $0.");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: playerId, role: "JUGADOR" },
      include: { wallet: true },
    });
    if (!user?.wallet) throw new Error("Jugador sin billetera.");

    const balanceBefore = user.wallet.balance;
    let balanceAfter: number;

    if (mode === "add") {
      const updated = await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: { increment: amt } },
      });
      balanceAfter = updated.balance;
    } else {
      const updated = await tx.wallet.updateMany({
        where: { id: user.wallet.id, balance: { gte: amt } },
        data: { balance: { decrement: amt } },
      });
      if (updated.count === 0) {
        throw new Error(
          `Saldo insuficiente. Disponible: ${formatMoney(balanceBefore)}.`
        );
      }
      const fresh = await tx.wallet.findUnique({ where: { id: user.wallet.id } });
      balanceAfter = fresh?.balance ?? balanceBefore - amt;
    }

    const defaultNote =
      mode === "add" ? "Recarga — cajero" : "Descuento — cajero";

    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        type: mode === "add" ? "DEPOSIT" : "WITHDRAWAL",
        amount: amt,
        balanceBefore,
        balanceAfter,
        note: note ?? defaultNote,
      },
    });

    return {
      mode,
      amount: amt,
      balanceBefore,
      balanceAfter,
      username: user.username,
    };
  });
}

/** @deprecated Use adjustPlayerWallet */
export async function depositToPlayer(
  playerId: string,
  amount: number,
  note?: string
) {
  const result = await adjustPlayerWallet(playerId, amount, "add", note);
  return {
    deposited: result.amount,
    balanceBefore: result.balanceBefore,
    balanceAfter: result.balanceAfter,
    username: result.username,
  };
}

type TicketWithItems = {
  id: string;
  ticketNumber: string;
  verificationCode: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  userId: string;
  items: {
    betType: string;
    numbers: string;
    amount: number;
    status: string;
    prizeAmount: number | null;
    lotteryName: string;
  }[];
};

export function toCajeroTicketView(ticket: TicketWithItems) {
  const totalPrize = ticket.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0);
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    totalAmount: ticket.totalAmount,
    totalPrize,
    createdAt: ticket.createdAt.toISOString(),
    items: ticket.items.map((i) => ({
      betType: i.betType,
      numbers: i.numbers,
      amount: i.amount,
      status: i.status,
      prizeAmount: i.prizeAmount,
      lotteryName: i.lotteryName,
    })),
  };
}

export async function getPendingWinnerTickets() {
  const tickets = await prisma.ticket.findMany({
    where: { status: "WINNER" },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 100,
  });
  return tickets.map(toCajeroTicketView);
}

export async function lookupTicket(query: string) {
  const queries = buildTicketSearchQueries(query);

  for (const q of queries) {
    const code = q.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketNumber: q },
          { internalTicketCode: q },
          { verificationCode: q },
          { verificationCode: code },
          { ticketNumber: { contains: q, mode: "insensitive" } },
          { internalTicketCode: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        user: { select: { fullName: true, username: true } },
        items: { include: { draw: { include: { lottery: true } } } },
      },
    });
    if (ticket) return ticket;
  }

  return null;
}

export async function lookupTicketForCajero(query: string) {
  const ticket = await lookupTicket(query);
  return ticket ? toCajeroTicketView(ticket) : null;
}

export async function getTicketReceiptForCajero(query: string): Promise<{
  id: string;
  receipt: ReceiptData;
  qrDataUrl: string;
  status: string;
  totalPrize: number;
  canCancel: boolean;
} | null> {
  const ticket = await lookupTicket(query);
  if (!ticket) return null;

  const receipt = buildReceiptData(ticket, ticket.user ?? undefined);
  if (ticket.customerName?.trim()) {
    receipt.playerName = ticket.customerName.trim();
  }
  if (ticket.paymentMethod === "CASH") {
    receipt.paymentMethod = "CASH";
  }

  const qrDataUrl = await generateTicketQrDataUrl(
    getQrTicketCode(ticket),
    ticket.verificationCode,
    ticket.internalTicketCode
  );
  const totalPrize = ticket.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0);

  return {
    id: ticket.id,
    receipt,
    qrDataUrl,
    status: ticket.status,
    totalPrize,
    canCancel: canCancelTicketForCajero(
      ticket.status,
      ticket.items.map((i) => i.draw)
    ),
  };
}

export async function getCajeroDashboardStats(_cajeroId: string) {
  const today = dayStartInTz();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const cashDayFilter = {
    paymentMethod: "CASH" as const,
    createdAt: { gte: today, lt: tomorrow },
    status: { not: "CANCELED" as const },
  };

  const deposits = await prisma.walletTransaction.findMany({
    where: {
      type: "DEPOSIT",
      createdAt: { gte: today },
      note: { contains: "cajero" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { wallet: { include: { user: { select: { fullName: true } } } } },
  });

  const playerCount = await prisma.user.count({
    where: { role: "JUGADOR", active: true },
  });

  const winnerTickets = await prisma.ticket.count({
    where: { status: "WINNER" },
  });

  const cashSales = await prisma.ticket.findMany({
    where: cashDayFilter,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      ticketNumber: true,
      totalAmount: true,
      customerName: true,
      createdAt: true,
    },
  });

  const cashAgg = await prisma.ticket.aggregate({
    where: cashDayFilter,
    _sum: { totalAmount: true },
    _count: true,
  });

  const cashPlaysCount = await prisma.ticketItem.count({
    where: {
      ticket: cashDayFilter,
    },
  });

  const salesHistory = await prisma.ticket.findMany({
    where: { paymentMethod: "CASH", status: { not: "CANCELED" } },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      ticketNumber: true,
      totalAmount: true,
      customerName: true,
      createdAt: true,
    },
  });

  return {
    deposits,
    playerCount,
    winnerTickets,
    cashSales: {
      count: cashAgg._count,
      playsCount: cashPlaysCount,
      total: cashAgg._sum.totalAmount ?? 0,
      recent: cashSales.map((s) => ({
        ticketNumber: s.ticketNumber,
        totalAmount: s.totalAmount,
        customerName: s.customerName,
        createdAt: s.createdAt.toISOString(),
      })),
      history: salesHistory.map((s) => ({
        ticketNumber: s.ticketNumber,
        totalAmount: s.totalAmount,
        customerName: s.customerName,
        createdAt: s.createdAt.toISOString(),
      })),
    },
  };
}
