import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRouletteAdminPanel } from "@/lib/roulette-admin-panel";
import {
  DEFAULT_ROULETTE_SETTINGS,
  getRouletteSettings,
  settingsForDbWrite,
  validateRouletteSettingsPatch,
  type RouletteSettingsData,
} from "@/lib/roulette-settings";

function mapBodyToPatch(body: Record<string, unknown>): Partial<RouletteSettingsData> {
  const raw: Partial<RouletteSettingsData> = {};

  if (typeof body.active === "boolean") raw.active = body.active;

  const numberFields: [string, keyof RouletteSettingsData][] = [
    ["rouletteDailyMinProfitPct", "dailyMinProfitPct"],
    ["dailyMinProfitPct", "dailyMinProfitPct"],
    ["rouletteDailyMaxProfitPct", "dailyMaxProfitPct"],
    ["dailyMaxProfitPct", "dailyMaxProfitPct"],
    ["rouletteDailyTargetProfitPct", "dailyTargetProfitPct"],
    ["dailyTargetProfitPct", "dailyTargetProfitPct"],
    ["dailyProfitPercent", "dailyProfitPercent"],
    ["housePercent", "housePercent"],
    ["promoPercent", "promoPercent"],
    ["rewardIntervalMinutes", "rewardIntervalMinutes"],
    ["maxRewardPercentOfPromoPool", "maxRewardPercentOfPromoPool"],
    ["minSpinsToQualify", "minSpinsToQualify"],
    ["minBetAmountToQualify", "minBetAmountToQualify"],
    ["cashbackAfterLosses", "cashbackAfterLosses"],
    ["cashbackPercent", "cashbackPercent"],
    ["maxCashbackAmount", "maxCashbackAmount"],
    ["spinWeight", "spinWeight"],
    ["dailyMissionBetAmount", "dailyMissionBetAmount"],
    ["dailyMissionBonus", "dailyMissionBonus"],
    ["activePlayerBonusPercent", "activePlayerBonusPercent"],
  ];

  const boolFields: [string, keyof RouletteSettingsData][] = [
    ["rouletteAutoAdjustmentEnabled", "autoAdjustmentEnabled"],
    ["autoAdjustmentEnabled", "autoAdjustmentEnabled"],
    ["rewardSystemActive", "rewardSystemActive"],
  ];

  for (const [bodyKey, patchKey] of numberFields) {
    if (body[bodyKey] !== undefined) {
      (raw as Record<string, number>)[patchKey] = Number(body[bodyKey]);
    }
  }
  for (const [bodyKey, patchKey] of boolFields) {
    if (body[bodyKey] !== undefined) {
      (raw as Record<string, boolean>)[patchKey] = Boolean(body[bodyKey]);
    }
  }
  if (body.rouletteAdjustmentType !== undefined || body.adjustmentType !== undefined) {
    const val = body.rouletteAdjustmentType ?? body.adjustmentType;
    raw.adjustmentType = String(val).toUpperCase() as RouletteSettingsData["adjustmentType"];
  }

  return raw;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json(await getRouletteAdminPanel());
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawPatch = mapBodyToPatch(body);

    if (Object.keys(rawPatch).length === 0) {
      return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
    }

    const current = await getRouletteSettings();
    const patch = validateRouletteSettingsPatch(rawPatch, current);
    const dbPatch = settingsForDbWrite(patch);

    await prisma.rouletteSettings.upsert({
      where: { id: "default" },
      update: dbPatch,
      create: {
        id: "default",
        ...settingsForDbWrite(DEFAULT_ROULETTE_SETTINGS),
        ...dbPatch,
      },
    });

    return NextResponse.json(await getRouletteAdminPanel());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar configuración.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
