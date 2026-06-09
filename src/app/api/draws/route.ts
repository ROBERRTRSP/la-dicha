import { NextResponse } from "next/server";
import { getOpenDrawsForPlayer } from "@/lib/draws";

export async function GET() {
  const draws = await getOpenDrawsForPlayer();
  return NextResponse.json({ draws });
}
