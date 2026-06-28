import {
  parseTicketQrPayload,
  ticketQrSearchQueries,
} from "@/lib/ticket-codes";

type LookupResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function tryQueries<T>(
  queries: string[],
  buildUrl: (q: string) => string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<LookupResult<T>> {
  let lastError = "Ticket no encontrado.";

  for (const q of queries) {
    const res = await fetch(buildUrl(q), {
      method,
      credentials: "include",
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      lastError = "Respuesta inválida del servidor.";
      continue;
    }
    if (res.ok) {
      return { ok: true, data: data as T };
    }
    lastError = String(data.error ?? lastError);
  }

  return { ok: false, error: lastError };
}

export type DuplicateLotteryRow = {
  key: string;
  label: string;
  kind: "draw" | "super_pale";
  playCount: number;
  subtotal: number;
  open: boolean;
  closedMessage?: string;
};

export type DuplicateTicketPreviewData = {
  ticketId: string;
  displayTicketNumber: string;
  ticketNumber: string;
  internalTicketCode?: string | null;
  totalAmount: number;
  createdAt: string;
  lotteries: DuplicateLotteryRow[];
};

export type DuplicateTicketApplyData = {
  displayTicketNumber: string;
  ticketNumber: string;
  lines: unknown[];
  addedCount: number;
  errors: string[];
  warnings: string[];
};

function searchQueriesFromRaw(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parsed = parseTicketQrPayload(trimmed);
  return parsed ? ticketQrSearchQueries(parsed) : [trimmed];
}

/** Busca ticket por texto QR o búsqueda manual. */
export async function fetchCajeroTicketLookup<T = { ticket: unknown }>(
  raw: string
): Promise<LookupResult<T>> {
  const queries = searchQueriesFromRaw(raw);
  if (queries.length === 0) {
    return { ok: false, error: "Ingrese el número de ticket." };
  }

  return tryQueries<T>(
    queries,
    (q) => `/api/cajero/tickets?q=${encodeURIComponent(q)}`
  );
}

/** Carga vista previa para duplicar (sin agregar al carrito). */
export async function fetchDuplicateTicketPreview(raw: string) {
  const queries = searchQueriesFromRaw(raw);
  if (queries.length === 0) {
    return { ok: false as const, error: "Ingrese el número de ticket." };
  }

  return tryQueries<DuplicateTicketPreviewData>(
    queries,
    (q) => `/api/cajero/tickets/duplicate?q=${encodeURIComponent(q)}`
  );
}

/** Duplica jugadas de loterías seleccionadas. */
export async function fetchDuplicateTicketApply(input: {
  ticketId: string;
  selectedLotteryKeys: string[];
  cart?: unknown[];
}) {
  const res = await fetch("/api/cajero/tickets/duplicate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { ok: false as const, error: "Respuesta inválida del servidor." };
  }

  if (!res.ok) {
    return {
      ok: false as const,
      error: String(data.error ?? "No se pudo duplicar."),
      errors: (data.errors as string[] | undefined) ?? [],
    };
  }

  return { ok: true as const, data: data as DuplicateTicketApplyData };
}
