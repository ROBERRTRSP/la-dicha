import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureWeekDraws, RESULTS_WEEK_DAYS } from "@/lib/draws";
import { BrandHeader } from "@/components/player/BrandHeader";
import {
  ResultsWeekPager,
  type ResultsDayData,
} from "@/components/player/ResultsWeekPager";
import { startOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TZ = "America/Santo_Domingo";

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function dayTitle(day: Date, offset: number) {
  if (offset === 0) return `Hoy · ${formatDayLabel(day)}`;
  if (offset === 1) return `Ayer · ${formatDayLabel(day)}`;
  return formatDayLabel(day);
}

export default async function ResultadosPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const now = toZonedTime(new Date(), TZ);
  const today = startOfDay(now);
  const weekStart = startOfDay(subDays(now, RESULTS_WEEK_DAYS - 1));

  await ensureWeekDraws();

  const allDraws = await prisma.draw.findMany({
    where: { drawDate: { gte: weekStart, lte: today } },
    include: { lottery: true, result: true },
    orderBy: { drawTime: "asc" },
  });

  const drawsByDay = new Map<number, typeof allDraws>();
  for (const draw of allDraws) {
    const key = startOfDay(draw.drawDate).getTime();
    if (!drawsByDay.has(key)) drawsByDay.set(key, []);
    drawsByDay.get(key)!.push(draw);
  }
  for (const draws of drawsByDay.values()) {
    draws.sort((a, b) => {
      const [ah, am] = a.drawTime.split(":").map(Number);
      const [bh, bm] = b.drawTime.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
  }

  const weekDays = Array.from({ length: RESULTS_WEEK_DAYS }, (_, i) =>
    startOfDay(subDays(now, i))
  );

  const weekRange = `${formatShortDate(weekStart)} – ${formatShortDate(today)}`;

  const days: ResultsDayData[] = weekDays
    .map((day, offset) => {
      const draws = drawsByDay.get(day.getTime()) ?? [];
      const confirmed = draws.filter((d) => d.result).length;
      const isToday = offset === 0;

      if (!isToday && confirmed === 0 && draws.length === 0) return null;

      return {
        date: day.toISOString(),
        title: dayTitle(day, offset),
        showPending: isToday,
        draws: draws.map((d) => ({
          id: d.id,
          drawTime: d.drawTime,
          lottery: {
            code: d.lottery.code,
            name: d.lottery.name,
            logoUrl: d.lottery.logoUrl,
          },
          result: d.result
            ? {
                first: d.result.first,
                second: d.result.second,
                third: d.result.third,
              }
            : null,
        })),
      };
    })
    .filter((d): d is ResultsDayData => d !== null);

  return (
    <div className="results-page">
      <BrandHeader balance={user.wallet?.balance ?? 0} title="Resultados" />

      <p className="results-date">Últimos {RESULTS_WEEK_DAYS} días · {weekRange}</p>

      <ResultsWeekPager days={days} />
    </div>
  );
}
