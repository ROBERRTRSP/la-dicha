import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getCajeroDashboardStats } from "@/lib/cajero-service";

export async function GET() {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const stats = await getCajeroDashboardStats(cajero.id);
    return NextResponse.json(stats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cargar ventas.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
