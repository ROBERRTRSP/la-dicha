import { NextResponse } from "next/server";
import { requireCajero } from "@/lib/auth";
import { getCajeroSellDraws } from "@/lib/draws";

export async function GET() {
  const cajero = await requireCajero();
  if (!cajero) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { draws, superPales } = await getCajeroSellDraws();
  return NextResponse.json({ draws, superPales });
}
