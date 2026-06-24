import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import {
  closeBancaDay,
  getBancaStatus,
  rechargeBanca,
} from "@/lib/banca-session";

export async function GET() {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const status = await getBancaStatus(cajero.id);
    return NextResponse.json(status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cargar banca.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      amount?: number;
      note?: string;
    };

    switch (body.action) {
      case "recharge": {
        const balance = await rechargeBanca(
          cajero.id,
          Number(body.amount),
          body.note
        );
        const status = await getBancaStatus(cajero.id);
        return NextResponse.json({ balance, status });
      }
      case "close": {
        const closingBalance = await closeBancaDay(cajero.id);
        const status = await getBancaStatus(cajero.id);
        return NextResponse.json({ closingBalance, status });
      }
      default:
        return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en banca.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
