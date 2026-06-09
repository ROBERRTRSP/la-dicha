import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { depositToPlayer } from "@/lib/cajero-service";

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { playerId, amount, note } = await request.json();
    const result = await depositToPlayer(
      String(playerId),
      Number(amount),
      note ? String(note) : `Recarga — ${cajero.fullName}`
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al recargar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
