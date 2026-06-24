import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateBancaSettings } from "@/lib/banca-session";
import {
  BET_AMOUNT_MAX,
  BET_AMOUNT_MIN,
  MAX_CART_LINES,
  MAX_CART_TOTAL,
} from "@/lib/cart-limits";
import { loadPlayLimitAdminState } from "@/lib/play-limit-context";
import {
  validatePlayLimitAdminPatch,
  type PlayLimitAdminSaveBody,
} from "@/lib/play-limit-admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const state = await loadPlayLimitAdminState();
  return NextResponse.json({
    settings: state.settings,
    lotteries: state.lotteries,
    system: {
      minBetAmount: BET_AMOUNT_MIN,
      maxBetAmount: BET_AMOUNT_MAX,
      maxCartLines: MAX_CART_LINES,
      maxCartTotal: MAX_CART_TOTAL,
    },
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as PlayLimitAdminSaveBody;
    const state = await loadPlayLimitAdminState();
    const { settings: patch, lotteryLimits } = validatePlayLimitAdminPatch(
      body,
      state.settings
    );

    if (Object.keys(patch).length > 0) {
      await updateBancaSettings(patch);
    }

    for (const row of lotteryLimits) {
      await prisma.lottery.update({
        where: { id: row.lotteryId },
        data: {
          maxDirectoPerNumber: row.maxDirectoPerNumber,
          maxPalePerNumber: row.maxPalePerNumber,
          maxTripletaPerNumber: row.maxTripletaPerNumber,
        },
      });
    }

    const updated = await loadPlayLimitAdminState();
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar límites.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
