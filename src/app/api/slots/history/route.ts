import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { isSlotGameId } from "@/lib/slots/games";
import { getSlotSpinHistory } from "@/lib/slots/spin-service";

export async function GET(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameId = String(searchParams.get("gameId") ?? "classic-7");
  const limitRaw = Number(searchParams.get("limit") ?? 8);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), 20)
    : 8;

  if (!isSlotGameId(gameId)) {
    return NextResponse.json({ error: "Juego no válido." }, { status: 400 });
  }

  const spins = await getSlotSpinHistory(user.id, gameId, limit);
  return NextResponse.json({ gameId, spins });
}
