import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  beginSlotSpinIdempotency,
  extractSlotIdempotencyKey,
  releaseSlotSpinIdempotency,
  saveSlotSpinResponse,
} from "@/lib/slot-idempotency";
import { SLOT_GAME_LIST } from "@/lib/slots/games";
import { getBonusState, getSlotSettings, isSlotsActive, placeSlotSpin, getAutoFreeSpinProgressForUser } from "@/lib/slots/spin-service";
import { enforceSpinRateLimit } from "@/lib/spin-rate-limit";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rateLimited = enforceSpinRateLimit(request, user.id, "slot");
  if (rateLimited) return rateLimited;

  let idempotencyKey: string | null = null;

  try {
    const body = await request.json();
    const gameId = String(body.gameId ?? "");
    const betAmount = Number(body.betAmount);
    if (!gameId || !Number.isFinite(betAmount)) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    idempotencyKey = extractSlotIdempotencyKey(body);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Falta clave de idempotencia para el giro." },
        { status: 400 }
      );
    }

    const { cached } = await beginSlotSpinIdempotency(user.id, idempotencyKey);
    if (cached) return NextResponse.json(cached);

    const result = await placeSlotSpin(user.id, gameId, betAmount);

    await saveSlotSpinResponse(
      user.id,
      idempotencyKey,
      result as unknown as Record<string, unknown>
    );

    return NextResponse.json(result);
  } catch (e) {
    if (idempotencyKey) {
      await releaseSlotSpinIdempotency(user.id, idempotencyKey).catch(() => {});
    }
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
  const autoFreeSpinProgress: Record<
    string,
    Awaited<ReturnType<typeof getAutoFreeSpinProgressForUser>>
  > = {};
  for (const game of SLOT_GAME_LIST) {
    bonusStates[game.id] = await getBonusState(user.id, game.id);
    autoFreeSpinProgress[game.id] = await getAutoFreeSpinProgressForUser(
      user.id,
      game.id
    );
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    active,
    balance: wallet?.balance ?? 0,
    minBetAmount: settings.minBetAmount,
    maxBetAmount: settings.maxBetAmount,
    bonusStates,
    autoFreeSpinProgress,
  });
}
