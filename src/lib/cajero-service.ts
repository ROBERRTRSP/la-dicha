import { prisma } from "./db";
import { hashPassword } from "./auth";

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

    if (mode === "subtract" && balanceBefore < amt) {
      throw new Error(
        `Saldo insuficiente. Disponible: RD$${balanceBefore.toFixed(2)}.`
      );
    }

    const updated = await tx.wallet.update({
      where: { id: user.wallet.id },
      data:
        mode === "add"
          ? { balance: { increment: amt } }
          : { balance: { decrement: amt } },
    });

    const defaultNote =
      mode === "add" ? "Recarga — cajero" : "Descuento — cajero";

    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        type: mode === "add" ? "DEPOSIT" : "WITHDRAWAL",
        amount: amt,
        balanceBefore,
        balanceAfter: updated.balance,
        note: note ?? defaultNote,
      },
    });

    return {
      mode,
      amount: amt,
      balanceBefore,
      balanceAfter: updated.balance,
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
  const q = query.trim();
  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [
        { ticketNumber: q },
        { verificationCode: q },
        { ticketNumber: { contains: q } },
      ],
    },
    include: {
      user: { select: { fullName: true, username: true } },
      items: { include: { draw: { include: { lottery: true } } } },
    },
  });
  return ticket;
}

export async function lookupTicketForCajero(query: string) {
  const q = query.trim();
  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [
        { ticketNumber: q },
        { verificationCode: q },
        { ticketNumber: { contains: q } },
      ],
    },
    include: { items: true },
  });
  return ticket ? toCajeroTicketView(ticket) : null;
}

export async function getCajeroDashboardStats(cajeroId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    where: {
      paymentMethod: "CASH",
      soldByCajeroId: cajeroId,
      createdAt: { gte: today },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      ticketNumber: true,
      totalAmount: true,
      customerName: true,
      createdAt: true,
    },
  });

  const cashAgg = await prisma.ticket.aggregate({
    where: {
      paymentMethod: "CASH",
      soldByCajeroId: cajeroId,
      createdAt: { gte: today },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  return {
    deposits,
    playerCount,
    winnerTickets,
    cashSales: {
      count: cashAgg._count,
      total: cashAgg._sum.totalAmount ?? 0,
      recent: cashSales.map((s) => ({
        ticketNumber: s.ticketNumber,
        totalAmount: s.totalAmount,
        customerName: s.customerName,
        createdAt: s.createdAt.toISOString(),
      })),
    },
  };
}
