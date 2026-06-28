import { NextResponse } from "next/server";
import { getCajeroSellDraws } from "@/lib/draws";
import { requirePlayer } from "@/lib/auth";

export async function GET() {
  await requirePlayer();
  const { draws, superPales } = await getCajeroSellDraws();
  return NextResponse.json({ draws, superPales });
}
