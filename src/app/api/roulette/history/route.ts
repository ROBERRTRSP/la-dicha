import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { getRouletteHistory } from "@/lib/roulette";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [history, rewardRows] = await Promise.all([
    getRouletteHistory(user.id, 15),
    prisma.rouletteScheduledReward.findMany({
      where: { playerId: user.id, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 15,
    }),
  ]);

  const rewards = rewardRows.map((r) => ({
    id: r.id,
    rewardType: r.rewardType,
    amount: r.amount,
    reason: r.reason,
    source: r.source,
    paidAt: (r.paidAt ?? r.createdAt).toISOString(),
  }));

  const totalReceived =
    Math.round(rewards.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  return NextResponse.json({ history, rewards, totalReceived });
}
