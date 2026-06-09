import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TZ = "America/Santo_Domingo";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  const base = dateParam
    ? new Date(dateParam + "T12:00:00")
    : toZonedTime(new Date(), TZ);
  const day = startOfDay(base);

  const draws = await prisma.draw.findMany({
    where: { drawDate: day },
    include: {
      lottery: { select: { name: true, code: true, drawTime: true } },
      result: true,
      _count: { select: { items: true } },
    },
    orderBy: { drawTime: "asc" },
  });

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
