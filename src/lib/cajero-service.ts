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

export async function depositToPlayer(
  playerId: string,
  amount: number,
  note?: string
) {
  if (amount <= 0) throw new Error("El monto debe ser mayor a $0.");

  const user = await prisma.user.findUnique({
    where: { id: playerId, role: "JUGADOR" },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new Error("Jugador sin billetera.");

  const balanceBefore = user.wallet.balance;
  const balanceAfter = balanceBefore + amount;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: balanceAfter },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        type: "DEPOSIT",
        amount,
        balanceBefore,
        balanceAfter,
        note: note ?? "Recarga — cajero",
      },
    }),
  ]);

  return { balanceAfter, username: user.username };
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

  return { deposits, playerCount, winnerTickets };
}
