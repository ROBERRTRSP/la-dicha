import type { Prisma } from "@prisma/client";
import {
  formatShortTicketNumber,
  genInternalTicketCode,
  genVerificationHash,
} from "./ticket-codes";

/** Asigna número corto (T-000001) + código interno largo de forma atómica. */
export async function allocateTicketNumbers(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<{
  ticketNumber: string;
  internalTicketCode: string;
  verificationCode: string;
}> {
  const sequence = tx.ticketSequence;
  if (!sequence?.upsert) {
    throw new Error(
      "Sistema de numeración de tickets no disponible. Reinicie el servidor o despliegue la última versión."
    );
  }

  const row = await sequence.upsert({
    where: { id: "default" },
    update: { value: { increment: 1 } },
    create: { id: "default", value: 1 },
  });

  const ticketNumber = formatShortTicketNumber(row.value);
  const internalTicketCode = genInternalTicketCode();
  const verificationCode = genVerificationHash(internalTicketCode, userId);

  return { ticketNumber, internalTicketCode, verificationCode };
}
