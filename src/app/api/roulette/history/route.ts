import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { getRouletteHistory } from "@/lib/roulette";

export async function GET() {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const history = await getRouletteHistory(user.id, 15);
  return NextResponse.json({ history });
}
