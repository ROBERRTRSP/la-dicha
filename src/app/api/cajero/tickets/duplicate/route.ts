import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import {
  applyDuplicateWithValidation,
  buildDuplicateLotteryOptions,
  type TicketItemForDuplicate,
} from "@/lib/cajero-duplicate-ticket";
import { lookupTicket } from "@/lib/cajero-service";
import { loadPlayLimitContext } from "@/lib/play-limit-context";
import { fetchTodaySoldPlayItems } from "@/lib/play-limits";
import { getCajeroSellDraws } from "@/lib/draws";
import {
  getDisplayTicketNumber,
  getQrTicketCode,
} from "@/lib/ticket-codes";
import { prisma } from "@/lib/db";
import type { CartLine } from "@/lib/cart-line";

function mapItems(
  items: {
    betType: string;
    numbers: string;
    amount: number;
    lotteryName: string;
    superPaleName?: string | null;
  }[]
): TicketItemForDuplicate[] {
  return items.map((i) => ({
    betType: i.betType,
    numbers: i.numbers,
    amount: i.amount,
    lotteryName: i.lotteryName,
    superPaleName: i.superPaleName,
  }));
}

export async function GET(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "Ingrese el número de ticket." },
      { status: 400 }
    );
  }

  const ticket = await lookupTicket(q);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  }

  if (ticket.status === "CANCELED") {
    return NextResponse.json(
      { error: "No se puede duplicar un ticket cancelado." },
      { status: 400 }
    );
  }

  const { draws: openDraws, superPales } = await getCajeroSellDraws();
  const lotteries = buildDuplicateLotteryOptions(
    mapItems(ticket.items),
    openDraws,
    superPales
  );

  return NextResponse.json({
    ticketId: ticket.id,
    displayTicketNumber: getDisplayTicketNumber(ticket),
    ticketNumber: ticket.ticketNumber,
    internalTicketCode: ticket.internalTicketCode ?? getQrTicketCode(ticket),
    totalAmount: ticket.totalAmount,
    createdAt: ticket.createdAt.toISOString(),
    lotteries,
  });
}

type DuplicatePostBody = {
  ticketId?: string;
  q?: string;
  selectedLotteryKeys?: string[];
  cart?: CartLine[];
};

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: DuplicatePostBody;
  try {
    body = (await request.json()) as DuplicatePostBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const selectedKeys = Array.isArray(body.selectedLotteryKeys)
    ? body.selectedLotteryKeys.filter((k) => typeof k === "string")
    : [];

  if (selectedKeys.length === 0) {
    return NextResponse.json(
      { error: "Seleccione al menos una lotería." },
      { status: 400 }
    );
  }

  let ticket = null;

  if (body.ticketId) {
    ticket = await prisma.ticket.findUnique({
      where: { id: body.ticketId },
      include: {
        user: { select: { fullName: true, username: true } },
        items: { include: { draw: { include: { lottery: true } } } },
      },
    });
  }

  if (!ticket && body.q?.trim()) {
    ticket = await lookupTicket(body.q.trim());
  }

  if (!ticket) {
    return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  }

  if (ticket.status === "CANCELED") {
    return NextResponse.json(
      { error: "No se puede duplicar un ticket cancelado." },
      { status: 400 }
    );
  }

  const { draws: openDraws, superPales } = await getCajeroSellDraws();
  const limitCtx = await loadPlayLimitContext();
  const soldItems = await fetchTodaySoldPlayItems();
  const cart = Array.isArray(body.cart) ? body.cart : [];

  const result = applyDuplicateWithValidation(
    mapItems(ticket.items),
    selectedKeys,
    openDraws,
    limitCtx,
    soldItems,
    cart,
    superPales
  );

  if (result.lines.length === 0) {
    return NextResponse.json(
      {
        error:
          result.errors[0] ??
          "No se pudo duplicar ninguna jugada con la selección actual.",
        errors: result.errors,
        warnings: result.warnings,
        addedCount: 0,
        lines: [],
        displayTicketNumber: getDisplayTicketNumber(ticket),
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    displayTicketNumber: getDisplayTicketNumber(ticket),
    ticketNumber: ticket.ticketNumber,
    lines: result.lines,
    addedCount: result.addedCount,
    errors: result.errors,
    warnings: result.warnings,
  });
}
