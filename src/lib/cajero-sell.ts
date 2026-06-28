import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { validateAndNormalizeCart } from "./cart-validation";
import { roundMoney } from "./cajero-banca-config";
import { dateKeyInTz } from "./timezone";
import {
  getBancaSettings,
  sellLimitsBlockSale,
  validateSellLimitsInTx,
  type SellLimitWarning,
} from "./banca-session";
import {
  buildTicketItemsCreate,
  validateCartLinesOpenInTx,
} from "./tickets";
import { allocateTicketNumbers } from "./ticket-allocation";

export class CajeroSellConfirmRequired extends Error {
  warnings: SellLimitWarning[];

  constructor(warnings: SellLimitWarning[]) {
    super("Se requiere confirmación de límites.");
    this.name = "CajeroSellConfirmRequired";
    this.warnings = warnings;
  }
}

async function ensureOpenBancaSessionInTx(
  tx: Prisma.TransactionClient,
  cajeroId: string,
  settings: Awaited<ReturnType<typeof getBancaSettings>>
) {
  const sessionDate = dateKeyInTz(new Date());

  let session = await tx.bancaDaySession.findUnique({
    where: {
      terminalCode_sessionDate: {
        terminalCode: settings.terminalCode,
        sessionDate,
      },
    },
  });

  if (!session) {
    const last = await tx.bancaDaySession.findFirst({
      where: {
        terminalCode: settings.terminalCode,
        status: "CLOSED",
        closingBalance: { not: null },
      },
      orderBy: { sessionDate: "desc" },
    });
    const opening = roundMoney(
      last?.closingBalance ?? settings.defaultOpeningBalance
    );
    session = await tx.bancaDaySession.create({
      data: {
        terminalCode: settings.terminalCode,
        sessionDate,
        openingBalance: opening,
        currentBalance: opening,
        openedById: cajeroId,
        transactions: {
          create: {
            type: "OPEN",
            amount: opening,
            balanceBefore: 0,
            balanceAfter: opening,
            note: `Apertura ${sessionDate}`,
            createdById: cajeroId,
          },
        },
      },
    });
  }

  if (session.status !== "OPEN") {
    throw new Error("No hay sesión de banca abierta hoy.");
  }

  return session;
}

async function recordBancaSaleInTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  cajeroId: string,
  totalAmount: number,
  ticketNumber: string
) {
  const session = await tx.bancaDaySession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.status !== "OPEN") {
    throw new Error("No hay sesión de banca abierta hoy.");
  }

  const balanceBefore = session.currentBalance;
  const delta = roundMoney(totalAmount);
  const balanceAfter = roundMoney(balanceBefore + delta);

  const updated = await tx.bancaDaySession.updateMany({
    where: { id: sessionId, status: "OPEN" },
    data: { currentBalance: balanceAfter },
  });
  if (updated.count === 0) {
    throw new Error("La sesión de banca cerró durante la venta. Intenta de nuevo.");
  }

  await tx.bancaTransaction.create({
    data: {
      sessionId,
      type: "SALE",
      amount: delta,
      balanceBefore,
      balanceAfter,
      note: `Venta ${ticketNumber}`,
      createdById: cajeroId,
    },
  });
}

/**
 * Venta en efectivo atómica: validación de límites + ticket + registro de banca.
 */
export async function executeCajeroCashSale(
  cajeroId: string,
  rawLines: unknown,
  customerName?: string,
  options?: { confirmWarnings?: boolean }
) {
  const { lines, total } = validateAndNormalizeCart(rawLines);
  const settings = await getBancaSettings();

  const mostrador = await prisma.user.findUnique({
    where: { username: "mostrador" },
  });
  if (!mostrador) {
    throw new Error("Cuenta de mostrador no configurada. Ejecuta el seed.");
  }

  return prisma.$transaction(
    async (tx) => {
      await validateCartLinesOpenInTx(tx, lines);

      const warnings = await validateSellLimitsInTx(tx, lines, settings);
      const block = sellLimitsBlockSale(warnings);
      if (block) throw new Error(block);

      if (warnings.length > 0 && !options?.confirmWarnings) {
        throw new CajeroSellConfirmRequired(warnings);
      }

      const session = await ensureOpenBancaSessionInTx(tx, cajeroId, settings);

      const numbers = await allocateTicketNumbers(tx, mostrador.id);

      const ticket = await tx.ticket.create({
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

      await recordBancaSaleInTx(
        tx,
        session.id,
        cajeroId,
        total,
        ticket.ticketNumber
      );

      return { ticket, warnings };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 8000,
      timeout: 20000,
    }
  );
}
