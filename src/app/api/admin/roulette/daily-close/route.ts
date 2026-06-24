import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  executeDailyClose,
  getSessionAdjustments,
  recalculateDailyClose,
  reopenDailySession,
} from "@/lib/roulette-daily-close";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sessionDate = String(body.sessionDate ?? "").trim();
    const action = String(body.action ?? "execute").toLowerCase();

    if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      return NextResponse.json(
        { error: "Fecha inválida (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    let result;
    if (action === "recalculate") {
      result = await recalculateDailyClose(sessionDate);
    } else if (action === "reopen") {
      result = await reopenDailySession(sessionDate);
    } else {
      result = await executeDailyClose(sessionDate);
    }

    return NextResponse.json({ ok: true, close: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en cierre diario.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const sessionDate = new URL(request.url).searchParams.get("sessionDate");
  if (!sessionDate) {
    return NextResponse.json(
      { error: "Parámetro sessionDate requerido." },
      { status: 400 }
    );
  }

  const adjustments = await getSessionAdjustments(sessionDate);
  return NextResponse.json({ sessionDate, adjustments });
}
