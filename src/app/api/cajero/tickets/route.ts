import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getPendingWinnerTickets,
  lookupTicketForCajero,
} from "@/lib/cajero-service";
import { payLotteryTicketPrize } from "@/lib/tickets";

export async function GET(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();

  if (!q) {
    const pending = await getPendingWinnerTickets();
    return NextResponse.json({ pending });
  }

  const ticket = await lookupTicketForCajero(q);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
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

    const result = await payLotteryTicketPrize(
      String(ticketId),
      `cajero ${cajero.fullName}`
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cobrar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
