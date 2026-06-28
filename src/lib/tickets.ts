import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { BetTypeCode } from "./bet-parser";
import { validateAndNormalizeCart } from "./cart-validation";
import type { CartLine } from "./cart-line";
import { getSuperPaleDefinition, superPaleReceiptTitle } from "./super-pale";
import { allocateTicketNumbers } from "./ticket-allocation";

export {
  cartLineTotal,
  cartLineUnitCount,
  isMultiLotteryLine,
  type CartLine,
} from "./cart-line";

/** Ventana para cancelar un ticket (5 minutos) */
export const TICKET_CANCEL_WINDOW_MS = 5 * 60 * 1000;

async function validateCartLinesOpen(lines: CartLine[]) {
  await validateCartLinesOpenInTx(prisma, lines);
}

export async function validateCartLinesOpenInTx(
  tx: Prisma.TransactionClient | typeof prisma,
  lines: CartLine[]
) {
  const now = new Date();
  for (const line of lines) {
    if (line.betType === "SUPER_PALE" || line.superPaleCode) {
      const def = getSuperPaleDefinition(line.superPaleCode ?? "");
      if (!def) throw new Error("Súper Palé no válido.");

      const closeDraw = await tx.draw.findFirst({
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

    const openCount = await tx.draw.count({
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

export function buildTicketItemsCreate(lines: CartLine[]) {
  return lines.flatMap((line) => {
    if (line.superPaleCode) {
      const betType: BetTypeCode =
        line.betType === "PALE" || line.betType === "SUPER_PALE"
          ? "SUPER_PALE"
          : line.betType;
      return [
        {
          drawId: line.drawIds[0],
          lotteryName: superPaleReceiptTitle(line.superPaleCode ?? line.superPaleName),
          betType,
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
  rawLines: unknown
) {
  const { lines, total } = validateAndNormalizeCart(rawLines);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new Error("Cuenta sin billetera.");

  if (user.wallet.balance < total)
    throw new Error("No tienes saldo suficiente para esta jugada.");

  await validateCartLinesOpen(lines);

  const balanceBefore = user.wallet.balance;
  const balanceAfter = balanceBefore - total;

  const ticket = await prisma.$transaction(async (tx) => {
    const numbers = await allocateTicketNumbers(tx, userId);

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
        note: `Ticket ${numbers.ticketNumber}`,
      },
    });

    const created = await tx.ticket.create({
      data: {
        ticketNumber: numbers.ticketNumber,
        internalTicketCode: numbers.internalTicketCode,
        verificationCode: numbers.verificationCode,
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

  return { ticket };
}

/** Venta en efectivo desde cajero / vanquero (sin descontar saldo digital). */
export async function createCashTicketFromCart(
  cajeroId: string,
  rawLines: unknown,
  customerName?: string
) {
  const { lines, total } = validateAndNormalizeCart(rawLines);

  const mostrador = await prisma.user.findUnique({
    where: { username: "mostrador" },
  });
  if (!mostrador) {
    throw new Error("Cuenta de mostrador no configurada. Ejecuta el seed.");
  }

  await validateCartLinesOpen(lines);

  const ticket = await prisma.$transaction(async (tx) => {
    const numbers = await allocateTicketNumbers(tx, mostrador.id);

    return tx.ticket.create({
      data: {
        ticketNumber: numbers.ticketNumber,
        internalTicketCode: numbers.internalTicketCode,
        verificationCode: numbers.verificationCode,
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
  });

  return { ticket };
}

type DrawCancelCheck = { status: string; closesAt: Date | string };

export function canCancelTicket(
  status: string,
  createdAt: Date | string
): boolean {
  if (status !== "ACTIVE") return false;
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Date.now() - created.getTime() <= TICKET_CANCEL_WINDOW_MS;
}

/** Cajero puede anular mientras todos los sorteos del ticket sigan abiertos. */
export function canCancelTicketForCajero(
  status: string,
  draws: DrawCancelCheck[]
): boolean {
  if (status !== "ACTIVE" || draws.length === 0) return false;
  const now = new Date();
  return draws.every((draw) => {
    const closesAt =
      typeof draw.closesAt === "string"
        ? new Date(draw.closesAt)
        : draw.closesAt;
    return (
      (draw.status === "OPEN" || draw.status === "CLOSING_SOON") &&
      closesAt > now
    );
  });
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

/** Anulación desde monitor / cajero (efectivo o saldo digital). */
export async function cancelTicketForCajero(
  cajeroLabel: string,
  ticketId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      items: { include: { draw: true } },
      user: { include: { wallet: true } },
    },
  });

  if (!ticket) throw new Error("Ticket no encontrado.");
  if (ticket.status !== "ACTIVE") {
    throw new Error("Este ticket ya no se puede cancelar.");
  }
  if (!canCancelTicketForCajero(ticket.status, ticket.items.map((i) => i.draw))) {
    throw new Error("No se puede cancelar: el sorteo ya cerró.");
  }

  if (ticket.paymentMethod === "CASH") {
    const canceled = await prisma.ticket.updateMany({
      where: { id: ticketId, status: "ACTIVE" },
      data: { status: "CANCELED", closedAt: new Date() },
    });
    if (canceled.count === 0) {
      throw new Error("Este ticket ya no se puede cancelar.");
    }
    return { ticketNumber: ticket.ticketNumber, paymentMethod: "CASH" as const };
  }

  const wallet = ticket.user.wallet;
  if (!wallet) throw new Error("Cuenta sin billetera.");

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + ticket.totalAmount;

  await prisma.$transaction(async (tx) => {
    const canceled = await tx.ticket.updateMany({
      where: { id: ticketId, status: "ACTIVE" },
      data: { status: "CANCELED", closedAt: new Date() },
    });
    if (canceled.count === 0) {
      throw new Error("Este ticket ya no se puede cancelar.");
    }
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
        note: `Cancelación cajero (${cajeroLabel}) ${ticket.ticketNumber}`,
      },
    });
  });

  return {
    ticketNumber: ticket.ticketNumber,
    paymentMethod: "WALLET" as const,
    balanceAfter,
  };
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
    const paid = await tx.ticket.updateMany({
      where: { id: ticketId, status: "WINNER" },
      data: { status: "PAID", closedAt: new Date() },
    });
    if (paid.count === 0) {
      throw new Error("Este ticket no tiene premio por cobrar.");
    }
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
