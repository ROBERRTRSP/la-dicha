import "server-only";

import QRCode from "qrcode";
import { buildTicketQrPayload } from "@/lib/ticket-codes";

/** QR simple y grande para escanear en papel térmico. */
export const TICKET_QR_OPTIONS = {
  margin: 2,
  width: 400,
  errorCorrectionLevel: "L" as const,
  color: { dark: "#000000", light: "#FFFFFF" },
};

export async function generateTicketQrDataUrl(
  ticketNumber: string,
  verificationCode: string,
  internalTicketCode?: string | null
): Promise<string> {
  const payload = buildTicketQrPayload(
    ticketNumber,
    verificationCode,
    internalTicketCode
  );
  return QRCode.toDataURL(payload, TICKET_QR_OPTIONS);
}
