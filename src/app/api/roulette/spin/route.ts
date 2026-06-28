import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { placeRouletteBets } from "@/lib/roulette";
import { enforceSpinRateLimit } from "@/lib/spin-rate-limit";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rateLimited = enforceSpinRateLimit(request, user.id, "roulette");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const result = await placeRouletteBets(user.id, body);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al girar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
