import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { createCashTicketFromCart, type CartLine } from "@/lib/tickets";

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { lines, customerName } = (await request.json()) as {
      lines: CartLine[];
      customerName?: string;
    };

    if (!lines?.length) {
      return NextResponse.json(
        { error: "Agrega una jugada antes de vender." },
        { status: 400 }
      );
    }

    const { ticket, qrDataUrl } = await createCashTicketFromCart(
      cajero.id,
      lines,
      customerName
    );

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        verificationCode: ticket.verificationCode,
        totalAmount: ticket.totalAmount,
        customerName: ticket.customerName,
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
    const msg = e instanceof Error ? e.message : "Error al vender ticket.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
