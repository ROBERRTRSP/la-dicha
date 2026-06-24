import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { recordBancaCashCancel } from "@/lib/banca-session";
import { cancelTicketForCajero } from "@/lib/tickets";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { ticketId } = (await request.json()) as { ticketId?: string };
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket requerido." }, { status: 400 });
    }

    const before = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        ticketNumber: true,
        totalAmount: true,
        paymentMethod: true,
      },
    });

    const result = await cancelTicketForCajero(cajero.fullName, ticketId);

    if (before?.paymentMethod === "CASH") {
      await recordBancaCashCancel(
        cajero.id,
        before.totalAmount,
        before.ticketNumber
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo cancelar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
