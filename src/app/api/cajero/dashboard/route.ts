import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getCajeroDashboardStats } from "@/lib/cajero-service";

export async function GET() {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const stats = await getCajeroDashboardStats(cajero.id);
  return NextResponse.json(stats);
}
