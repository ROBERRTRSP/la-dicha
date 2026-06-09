import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { lookupTicket } from "@/lib/cajero-service";
import { collectTicket } from "@/lib/tickets";

export async function GET(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Ingresa número de ticket." }, { status: 400 });
  }

  const ticket = await lookupTicket(q);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  }

  const totalPrize = ticket.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0);

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount: ticket.totalAmount,
      totalPrize,
      createdAt: ticket.createdAt.toISOString(),
      player: ticket.user,
      items: ticket.items.map((i) => ({
        betType: i.betType,
        numbers: i.numbers,
        amount: i.amount,
        status: i.status,
        prizeAmount: i.prizeAmount,
        lotteryName: i.lotteryName,
      })),
    },
  });
}

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { ticketId } = await request.json();
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket requerido." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: String(ticketId) },
      select: { id: true, userId: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }

    const result = await collectTicket(ticket.userId, ticket.id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cobrar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
