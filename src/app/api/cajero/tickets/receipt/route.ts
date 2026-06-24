import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getTicketReceiptForCajero } from "@/lib/cajero-service";

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

  const result = await getTicketReceiptForCajero(q);
  if (!result) {
    return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  }

  return NextResponse.json(result);
}
