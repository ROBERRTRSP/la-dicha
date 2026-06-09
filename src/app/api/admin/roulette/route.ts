import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRouletteAdminStats } from "@/lib/roulette";
import {
  DEFAULT_ROULETTE_SETTINGS,
  type RouletteSettingsData,
} from "@/lib/roulette-settings";

const SETTINGS_KEYS = Object.keys(
  DEFAULT_ROULETTE_SETTINGS
) as (keyof RouletteSettingsData)[];

function pickSettings(body: Record<string, unknown>): Partial<RouletteSettingsData> {
  const out: Partial<RouletteSettingsData> = {};
  for (const key of SETTINGS_KEYS) {
    if (body[key] !== undefined) {
      (out as Record<string, unknown>)[key] = body[key];
    }
  }
  return out;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const stats = await getRouletteAdminStats();

  return NextResponse.json({
    active: stats.settings.active,
    ...stats,
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const patch = pickSettings(body);

  if (Object.keys(patch).length === 0 && typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  const settings = await prisma.rouletteSettings.upsert({
    where: { id: "default" },
    update: {
      ...patch,
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
    create: {
      id: "default",
      ...DEFAULT_ROULETTE_SETTINGS,
      ...patch,
      active: typeof body.active === "boolean" ? body.active : true,
    },
  });

  return NextResponse.json({ settings });
}
