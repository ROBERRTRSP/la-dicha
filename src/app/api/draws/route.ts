import { NextResponse } from "next/server";
import { getCajeroSellDraws } from "@/lib/draws";

export async function GET() {
  const { draws, superPales } = await getCajeroSellDraws();
  return NextResponse.json({ draws, superPales });
}
