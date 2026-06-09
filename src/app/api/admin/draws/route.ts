import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dedupeDrawsForDisplay } from "@/lib/results-sync";
import { dayStartInTz, nowInTz } from "@/lib/timezone";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  const day = dateParam
    ? dayStartInTz(new Date(dateParam + "T12:00:00"))
    : dayStartInTz(nowInTz());

  const rawDraws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(day.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(day.getTime() + 36 * 60 * 60 * 1000),
      },
    },
    include: {
      lottery: { select: { name: true, code: true, drawTime: true } },
      result: true,
      _count: { select: { items: true } },
    },
    orderBy: { drawTime: "asc" },
  });

  const draws = dedupeDrawsForDisplay(rawDraws);

  return NextResponse.json({
    date: day.toISOString(),
    draws: draws.map((d) => ({
      id: d.id,
      lotteryName: d.lottery.name,
      lotteryCode: d.lottery.code,
      drawTime: d.drawTime,
      status: d.status,
      closesAt: d.closesAt.toISOString(),
      ticketItems: d._count.items,
      result: d.result
        ? { first: d.result.first, second: d.result.second, third: d.result.third }
        : null,
    })),
  });
}
