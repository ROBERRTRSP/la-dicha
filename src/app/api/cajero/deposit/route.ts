import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { adjustPlayerWallet } from "@/lib/cajero-service";

export async function POST(request: Request) {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { playerId, amount, mode, note } = await request.json();
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json({ error: "Jugador no indicado." }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    const op = mode === "subtract" ? "subtract" : "add";
    const label = op === "add" ? "Recarga" : "Descuento";

    const result = await adjustPlayerWallet(
      playerId,
      amt,
      op,
      note ? String(note) : `${label} — ${cajero.fullName}`
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ajustar saldo.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
