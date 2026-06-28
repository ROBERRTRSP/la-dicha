import { createHash, randomBytes } from "crypto";

const TERMINAL = "bei-013";
const SHORT_TICKET_RE = /^T-\d{6}$/i;
const INTERNAL_TICKET_RE = /\b([A-Fa-f0-9]{2}-bei-\d{3}-\d{6,12})\b/i;

/** Número corto visible: T-000126 */
export function formatShortTicketNumber(seq: number): string {
  const n = Math.max(1, Math.floor(seq));
  return `T-${String(n).padStart(6, "0")}`;
}

export function isShortTicketNumber(value: string): boolean {
  return SHORT_TICKET_RE.test(value.trim());
}

export function isInternalTicketCode(value: string): boolean {
  return INTERNAL_TICKET_RE.test(value.trim());
}

/** Código interno largo (QR / respaldo). */
export function genInternalTicketCode(): string {
  const prefix = randomBytes(1).toString("hex").toUpperCase().padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
  return `${prefix}-${TERMINAL}-${seq}`;
}

export function genVerificationHash(ticketRef: string, userId: string): string {
  return createHash("sha256")
    .update(`${ticketRef}|${userId}|${Date.now()}|LA-DICHA`)
    .digest("hex")
    .toUpperCase()
    .slice(0, 32);
}

export function getDisplayTicketNumber(ticket: {
  ticketNumber: string;
  internalTicketCode?: string | null;
}): string {
  if (isShortTicketNumber(ticket.ticketNumber)) return ticket.ticketNumber;
  return ticket.ticketNumber;
}

export function getQrTicketCode(ticket: {
  ticketNumber: string;
  internalTicketCode?: string | null;
}): string {
  if (ticket.internalTicketCode?.trim()) return ticket.internalTicketCode.trim();
  if (isInternalTicketCode(ticket.ticketNumber)) return ticket.ticketNumber;
  return ticket.ticketNumber.trim();
}

/** Normaliza búsqueda manual: 126 → T-000126, t000126 → T-000126 */
export function normalizeShortTicketQuery(raw: string): string | null {
  const q = raw.trim();
  if (!q) return null;

  const upper = q.toUpperCase().replace(/\s+/g, "");
  const tMatch = upper.match(/^T-?(\d{1,6})$/);
  if (tMatch) {
    return formatShortTicketNumber(parseInt(tMatch[1], 10));
  }

  if (/^\d{1,6}$/.test(q)) {
    return formatShortTicketNumber(parseInt(q, 10));
  }

  if (SHORT_TICKET_RE.test(upper)) {
    const num = parseInt(upper.slice(2), 10);
    return formatShortTicketNumber(num);
  }

  return null;
}

/** Variantes de búsqueda para ticket (corto, interno, hash). */
export function buildTicketSearchQueries(raw: string): string[] {
  const q = raw.trim();
  if (!q) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (v?: string) => {
    const s = v?.trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  add(q);
  add(q.toUpperCase());

  const short = normalizeShortTicketQuery(q);
  add(short ?? undefined);

  const code = q.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (code.length >= 6) add(code);

  const internal = q.match(INTERNAL_TICKET_RE);
  if (internal) add(internal[1]);

  return out;
}

/** QR: código interno largo (o legado). */
export function buildTicketQrPayload(
  ticketNumber: string,
  verificationCode?: string,
  internalTicketCode?: string | null
): string {
  const internal = internalTicketCode?.trim();
  if (internal) return internal;
  if (isInternalTicketCode(ticketNumber)) return ticketNumber.trim();
  if (verificationCode && !isShortTicketNumber(ticketNumber)) {
    return buildTicketQrPayloadLegacy(ticketNumber, verificationCode);
  }
  return ticketNumber.trim();
}

export function buildTicketQrPayloadLegacy(
  ticketNumber: string,
  verificationCode: string
): string {
  return `LA-DICHA|${ticketNumber}|${verificationCode}`;
}

export type TicketQrPayload = {
  ticketNumber?: string;
  verificationCode?: string;
  query: string;
};

function normalizeQrText(raw: string): string {
  let text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";

  try {
    if (/%[0-9A-Fa-f]{2}/.test(text)) {
      text = decodeURIComponent(text);
    }
  } catch {
    /* mantener original */
  }

  if (text.startsWith("{")) {
    try {
      const json = JSON.parse(text) as Record<string, string>;
      const ticket =
        json.ticketNumber ?? json.ticket ?? json.numero ?? json.id;
      const code = json.verificationCode ?? json.code ?? json.hash;
      if (ticket) {
        return code ? `LA-DICHA|${ticket}|${code}` : ticket;
      }
    } catch {
      /* no es JSON */
    }
  }

  return text.trim();
}

function extractInternalTicketCode(text: string): string | null {
  const match = text.match(INTERNAL_TICKET_RE);
  return match ? match[1] : null;
}

export function parseTicketQrPayload(raw: string): TicketQrPayload | null {
  const normalized = normalizeQrText(raw);
  if (!normalized) return null;

  if (normalized.includes("|")) {
    const parts = normalized.split("|").map((p) => p.trim());
    const brand = parts[0]?.toUpperCase();

    if ((brand === "LA-DICHA" || brand === "LA DICHA") && parts[1]) {
      const ticketNumber = parts[1];
      const verificationCode = parts[2]?.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      return {
        ticketNumber,
        verificationCode,
        query: ticketNumber,
      };
    }

    if (parts[0]?.toLowerCase().includes("bei-")) {
      return {
        ticketNumber: parts[0],
        verificationCode: parts[1]?.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        query: parts[0],
      };
    }
  }

  const internal = extractInternalTicketCode(normalized);
  if (internal) {
    return { ticketNumber: internal, query: internal };
  }

  const short = normalizeShortTicketQuery(normalized);
  if (short) {
    return { ticketNumber: short, query: short };
  }

  const hex = normalized.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^[A-F0-9]{24,32}$/.test(hex)) {
    return { verificationCode: hex, query: hex };
  }

  if (normalized.length >= 3) {
    return { query: normalized };
  }

  return null;
}

export function ticketQrSearchQueries(parsed: TicketQrPayload): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function add(value?: string) {
    for (const q of buildTicketSearchQueries(value ?? "")) {
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    }
  }

  add(parsed.ticketNumber);
  add(parsed.verificationCode);
  add(parsed.query);

  return out;
}
