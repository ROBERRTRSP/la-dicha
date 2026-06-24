import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { settleDraw } from "@/lib/settlement";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { drawId, first, second, third, settle } = await request.json();

    if (!drawId || !first || !second || !third) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const pad = (n: string | number) => {
      const raw = String(n).trim();
      if (!/^\d{1,2}$/.test(raw)) {
        throw new Error(`Número inválido: ${n}`);
      }
      const padded = raw.padStart(2, "0");
      if (Number(padded) > 99) {
        throw new Error(`Número fuera de rango (00-99): ${n}`);
      }
      return padded;
    };

    const f = pad(first);
    const s = pad(second);
    const t = pad(third);

    await prisma.result.upsert({
      where: { drawId },
      update: {
        first: f,
        second: s,
        third: t,
        confirmed: true,
        source: "MANUAL",
        syncedAt: null,
      },
      create: {
        drawId,
        first: f,
        second: s,
        third: t,
        confirmed: true,
        source: "MANUAL",
      },
    });

    let settled = 0;
    if (settle !== false) {
      const r = await settleDraw(drawId);
      settled = r.settled;
    } else {
      await prisma.draw.update({
        where: { id: drawId },
        data: { status: "RESULT_AVAILABLE" },
      });
    }

    return NextResponse.json({ ok: true, settled });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar resultado.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
