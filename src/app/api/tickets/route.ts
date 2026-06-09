import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { createTicketFromCart, type CartLine } from "@/lib/tickets";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { lines } = (await request.json()) as { lines: CartLine[] };
    if (!lines?.length) {
      return NextResponse.json(
        { error: "Agrega una jugada antes de confirmar." },
        { status: 400 }
      );
    }

    const { ticket, qrDataUrl } = await createTicketFromCart(user.id, lines);

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        verificationCode: ticket.verificationCode,
        totalAmount: ticket.totalAmount,
        balanceBefore: ticket.balanceBefore,
        balanceAfter: ticket.balanceAfter,
        createdAt: ticket.createdAt.toISOString(),
        items: ticket.items.map((i) => ({
          betType: i.betType,
          numbers: i.numbers,
          lotteryName: i.lotteryName,
          amount: i.amount,
          drawTime: i.draw.drawTime,
          drawDate: i.draw.drawDate.toISOString(),
          superPaleName: i.superPaleName,
        })),
      },
      qrDataUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear ticket.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
