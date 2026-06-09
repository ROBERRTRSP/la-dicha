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

    const pad = (n: string) => String(n).padStart(2, "0").slice(-2);

    await prisma.result.upsert({
      where: { drawId },
      update: {
        first: pad(first),
        second: pad(second),
        third: pad(third),
        confirmed: true,
      },
      create: {
        drawId,
        first: pad(first),
        second: pad(second),
        third: pad(third),
        confirmed: true,
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
