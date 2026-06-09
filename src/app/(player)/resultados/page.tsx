import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { ensureWeekDraws, RESULTS_WEEK_DAYS } from "@/lib/draws";
import { fetchDrawsForWeek, repairWeekResults } from "@/lib/results-sync";
import { compareDrawTime } from "@/lib/utils";
import { dayStartInTz, nowInTz } from "@/lib/timezone";
import { BrandHeader } from "@/components/player/BrandHeader";
import {
  ResultsWeekPager,
  type ResultsDayData,
} from "@/components/player/ResultsWeekPager";
import { subDays } from "date-fns";

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

  const now = nowInTz();
  const today = dayStartInTz(now);
  const weekStart = dayStartInTz(subDays(now, RESULTS_WEEK_DAYS - 1));

  await ensureWeekDraws();
  await repairWeekResults(RESULTS_WEEK_DAYS);

  const uniqueDraws = await fetchDrawsForWeek(weekStart, today);

  const drawsByDay = new Map<number, typeof uniqueDraws>();
  for (const draw of uniqueDraws) {
    const key = dayStartInTz(draw.drawDate).getTime();
    if (!drawsByDay.has(key)) drawsByDay.set(key, []);
    drawsByDay.get(key)!.push(draw);
  }
  for (const draws of drawsByDay.values()) {
    draws.sort((a, b) => compareDrawTime(a.drawTime, b.drawTime));
  }

  const weekDays = Array.from({ length: RESULTS_WEEK_DAYS }, (_, i) =>
    dayStartInTz(subDays(now, i))
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
