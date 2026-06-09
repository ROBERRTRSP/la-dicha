import QRCode from "qrcode";
import { prisma } from "./db";
import type { BetTypeCode } from "./bet-parser";
import { getSuperPaleDefinition } from "./super-pale";
import { genPosTicketNumber, genVerificationHash } from "./ticket-codes";

/** Ventana para cancelar un ticket (5 minutos) */
export const TICKET_CANCEL_WINDOW_MS = 5 * 60 * 1000;

export function cartLineTotal(line: CartLine) {
  return line.betType === "SUPER_PALE" ? line.amount : line.amount * line.drawIds.length;
}

export type CartLine = {
  id: string;
  betType: BetTypeCode;
  numbers: string;
  digits: string;
  amount: number;
  drawIds: string[];
  lotteryNames: string[];
  superPaleCode?: string;
  superPaleName?: string;
  addedAt: number;
};

async function validateCartLinesOpen(lines: CartLine[]) {
  const now = new Date();
  for (const line of lines) {
    if (line.betType === "SUPER_PALE") {
      const def = getSuperPaleDefinition(line.superPaleCode ?? "");
      if (!def) throw new Error("Súper Palé no válido.");

      const closeDraw = await prisma.draw.findFirst({
        where: {
          id: { in: line.drawIds },
          lottery: { code: def.closesWithLotteryCode },
          status: { in: ["OPEN", "CLOSING_SOON"] },
          closesAt: { gt: now },
        },
      });
      if (!closeDraw) throw new Error("Ese Súper Palé ya cerró.");
      continue;
    }

    const openCount = await prisma.draw.count({
      where: {
        id: { in: line.drawIds },
        status: { in: ["OPEN", "CLOSING_SOON"] },
        closesAt: { gt: now },
      },
    });
    if (openCount !== line.drawIds.length) {
      throw new Error("Una o más loterías ya cerraron.");
    }
  }
}

function buildTicketItemsCreate(lines: CartLine[]) {
  return lines.flatMap((line) => {
    if (line.betType === "SUPER_PALE") {
      return [
        {
          drawId: line.drawIds[0],
          lotteryName: line.superPaleName ?? line.lotteryNames.join(" + "),
          betType: line.betType,
          numbers: line.numbers,
          amount: line.amount,
          superPaleName: line.superPaleCode ?? line.superPaleName,
        },
      ];
    }
    return line.drawIds.map((drawId, i) => ({
      drawId,
      lotteryName: line.lotteryNames[i] ?? line.lotteryNames[0],
      betType: line.betType,
      numbers: line.numbers,
      amount: line.amount,
    }));
  });
}

export async function createTicketFromCart(
  userId: string,
  lines: CartLine[]
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new Error("Cuenta sin billetera.");

  const total = lines.reduce((sum, l) => sum + cartLineTotal(l), 0);
  if (total <= 0) throw new Error("Agrega una jugada antes de confirmar.");
  if (user.wallet.balance < total)
    throw new Error("No tienes saldo suficiente para esta jugada.");

  await validateCartLinesOpen(lines);

  const ticketNumber = genPosTicketNumber();
  const verificationCode = genVerificationHash(ticketNumber, userId);
  const balanceBefore = user.wallet.balance;
  const balanceAfter = balanceBefore - total;

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { balance: balanceAfter },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        type: "BET",
        amount: -total,
        balanceBefore,
        balanceAfter,
        note: `Ticket ${ticketNumber}`,
      },
    });

    const created = await tx.ticket.create({
      data: {
        ticketNumber,
        verificationCode,
        userId,
        totalAmount: total,
        balanceBefore,
        balanceAfter,
        status: "ACTIVE",
        items: {
          create: buildTicketItemsCreate(lines),
        },
      },
      include: {
        items: { include: { draw: { include: { lottery: true } } } },
        user: true,
      },
    });

    return created;
  });

  const qrData = `LA-DICHA|${ticket.ticketNumber}|${ticket.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 200 });

  return { ticket, qrDataUrl };
}

/** Venta en efectivo desde cajero / vanquero (sin descontar saldo digital). */
export async function createCashTicketFromCart(
  cajeroId: string,
  lines: CartLine[],
  customerName?: string
) {
  const mostrador = await prisma.user.findUnique({
    where: { username: "mostrador" },
  });
  if (!mostrador) {
    throw new Error("Cuenta de mostrador no configurada. Ejecuta el seed.");
  }

  const total = lines.reduce((sum, l) => sum + cartLineTotal(l), 0);
  if (total <= 0) throw new Error("Agrega una jugada antes de confirmar.");

  await validateCartLinesOpen(lines);

  const ticketNumber = genPosTicketNumber();
  const verificationCode = genVerificationHash(ticketNumber, mostrador.id);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      verificationCode,
      userId: mostrador.id,
      totalAmount: total,
      balanceBefore: 0,
      balanceAfter: 0,
      status: "ACTIVE",
      paymentMethod: "CASH",
      soldByCajeroId: cajeroId,
      customerName: customerName?.trim() || null,
      items: {
        create: buildTicketItemsCreate(lines),
      },
    },
    include: {
      items: { include: { draw: { include: { lottery: true } } } },
      user: true,
    },
  });

  const qrData = `LA-DICHA|${ticket.ticketNumber}|${ticket.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 200 });

  return { ticket, qrDataUrl };
}

export function canCancelTicket(
  status: string,
  createdAt: Date | string
): boolean {
  if (status !== "ACTIVE") return false;
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Date.now() - created.getTime() <= TICKET_CANCEL_WINDOW_MS;
}

export function cancelTicketMsLeft(createdAt: Date | string): number {
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Math.max(0, TICKET_CANCEL_WINDOW_MS - (Date.now() - created.getTime()));
}

export async function cancelTicket(userId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId },
    include: { user: { include: { wallet: true } } },
  });

  if (!ticket) throw new Error("Ticket no encontrado.");
  if (ticket.status !== "ACTIVE") {
    throw new Error("Este ticket ya no se puede cancelar.");
  }
  if (!canCancelTicket(ticket.status, ticket.createdAt)) {
    throw new Error("Solo puedes cancelar dentro de los primeros 5 minutos.");
  }

  const wallet = ticket.user.wallet;
  if (!wallet) throw new Error("Cuenta sin billetera.");

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + ticket.totalAmount;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: "CANCELED", closedAt: new Date() },
    });
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CANCEL",
        amount: ticket.totalAmount,
        balanceBefore,
        balanceAfter,
        note: `Cancelación ${ticket.ticketNumber}`,
      },
    });
  });

  return { balanceAfter, ticketNumber: ticket.ticketNumber };
}

/**
 * Paga premio de lotería en ventanilla (efectivo).
 * Regla: premios de lotería NUNCA se acreditan al saldo digital.
 * Solo la ruleta suma premios al saldo automáticamente.
 */
export async function payLotteryTicketPrize(
  ticketId: string,
  paidBy: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { include: { wallet: true } },
      items: true,
    },
  });

  if (!ticket) throw new Error("Ticket no encontrado.");
  if (ticket.status !== "WINNER") {
    throw new Error("Este ticket no tiene premio por cobrar.");
  }

  const prize = ticket.items.reduce((sum, item) => sum + (item.prizeAmount ?? 0), 0);
  if (prize <= 0) throw new Error("No hay premio disponible en este ticket.");

  const wallet = ticket.user.wallet;
  const balance = wallet?.balance ?? 0;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: "PAID", closedAt: new Date() },
    });
    await tx.ticketItem.updateMany({
      where: { ticketId, status: "WINNER" },
      data: { status: "PAID" },
    });

    if (wallet) {
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "PRIZE_PAID_CASH",
          amount: prize,
          balanceBefore: balance,
          balanceAfter: balance,
          note: `Premio lotería en ventanilla ${ticket.ticketNumber} — ${paidBy}`,
        },
      });
    }
  });

  return {
    prize,
    ticketNumber: ticket.ticketNumber,
    paidInCash: true,
    balanceAfter: balance,
  };
}
