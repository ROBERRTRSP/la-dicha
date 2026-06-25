import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SLOT_GAME_LIST } from "@/lib/slots/games";
import { getBonusState, getSlotSettings, isSlotsActive, placeSlotSpin } from "@/lib/slots/spin-service";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gameId = String(body.gameId ?? "");
    const betAmount = Number(body.betAmount);
    if (!gameId || !Number.isFinite(betAmount)) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const result = await placeSlotSpin(user.id, gameId, betAmount);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al girar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET() {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const settings = await getSlotSettings();
  const active = await isSlotsActive();
  const bonusStates: Record<string, Awaited<ReturnType<typeof getBonusState>>> = {};
  for (const game of SLOT_GAME_LIST) {
    bonusStates[game.id] = await getBonusState(user.id, game.id);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    active,
    balance: wallet?.balance ?? 0,
    minBetAmount: settings.minBetAmount,
    maxBetAmount: settings.maxBetAmount,
    bonusStates,
  });
}
