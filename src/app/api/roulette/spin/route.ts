import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import {
  placeRouletteBets,
  type RouletteBetInput,
  type RouletteBetType,
} from "@/lib/roulette";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    let bets: RouletteBetInput[] = [];

    if (Array.isArray(body.bets) && body.bets.length > 0) {
      bets = body.bets.map(
        (b: { betType: string; betChoice: string; amount: number }) => ({
          betType: b.betType as RouletteBetType,
          betChoice: String(b.betChoice ?? ""),
          amount: Number(b.amount),
        })
      );
    } else if (body.betType) {
      bets = [
        {
          betType: body.betType as RouletteBetType,
          betChoice: String(body.betChoice ?? ""),
          amount: Number(body.amount),
        },
      ];
    }

    const result = await placeRouletteBets(user.id, bets);

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al girar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
