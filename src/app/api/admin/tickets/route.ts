import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { payLotteryTicketPrize } from "@/lib/tickets";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();

  const tickets = await prisma.ticket.findMany({
    where: q
      ? {
          OR: [
            { ticketNumber: { contains: q } },
            { verificationCode: { contains: q } },
            { user: { username: { contains: q } } },
            { user: { fullName: { contains: q } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { fullName: true, username: true } },
      items: { include: { draw: { include: { lottery: true } } } },
    },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      totalAmount: t.totalAmount,
      totalPrize: t.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0),
      createdAt: t.createdAt.toISOString(),
      user: t.user,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { ticketId } = await request.json();
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket requerido." }, { status: 400 });
    }

    const result = await payLotteryTicketPrize(
      String(ticketId),
      `admin ${admin.fullName}`
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al pagar premio.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
