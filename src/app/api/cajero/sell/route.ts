import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import {
  CajeroSellConfirmRequired,
  executeCajeroCashSale,
} from "@/lib/cajero-sell";
import { generateTicketQrDataUrl } from "@/lib/ticket-qr";
import type { CartLine } from "@/lib/tickets";

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { lines, customerName, confirmWarnings } = (await request.json()) as {
      lines: CartLine[];
      customerName?: string;
      confirmWarnings?: boolean;
    };

    if (!lines?.length) {
      return NextResponse.json(
        { error: "Agrega una jugada antes de vender." },
        { status: 400 }
      );
    }

    const { ticket } = await executeCajeroCashSale(
      cajero.id,
      lines,
      customerName,
      { confirmWarnings: confirmWarnings === true }
    );

    const qrDataUrl = await generateTicketQrDataUrl(
      ticket.ticketNumber,
      ticket.verificationCode,
      ticket.internalTicketCode
    );

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        internalTicketCode: ticket.internalTicketCode,
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
    if (e instanceof CajeroSellConfirmRequired) {
      return NextResponse.json(
        {
          warnings: e.warnings.map((w) => w.message),
          requireConfirm: true,
        },
        { status: 409 }
      );
    }
    const msg = e instanceof Error ? e.message : "Error al vender ticket.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
