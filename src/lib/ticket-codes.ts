import { createHash, randomBytes } from "crypto";

const TERMINAL = "bei-013";

export function genPosTicketNumber(): string {
  const prefix = randomBytes(1).toString("hex").toUpperCase().padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
  return `${prefix}-${TERMINAL}-${seq}`;
}

export function genVerificationHash(ticketNumber: string, userId: string): string {
  return createHash("sha256")
    .update(`${ticketNumber}|${userId}|${Date.now()}|LA-DICHA`)
    .digest("hex")
    .toUpperCase()
    .slice(0, 32);
}
