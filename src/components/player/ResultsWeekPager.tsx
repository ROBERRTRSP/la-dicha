"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResultsDaySection } from "@/components/player/ResultsDaySection";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export type ResultsDayData = {
  date: string;
  title: string;
  showPending: boolean;
  draws: {
    id: string;
    drawTime: string;
    lottery: {
      code: string;
      name: string;
      logoUrl: string | null;
    };
    result: {
      first: string;
      second: string;
      third: string;
    } | null;
  }[];
};

export function ResultsWeekPager({ days }: { days: ResultsDayData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || days.length === 0) return;
    const i = Math.max(0, Math.min(index, days.length - 1));
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    setActive(i);
  }, [days.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const w = track.clientWidth;
        if (!w) return;
        const i = Math.round(track.scrollLeft / w);
        setActive(Math.max(0, Math.min(i, days.length - 1)));
      }, 80);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      track.removeEventListener("scroll", onScroll);
    };
  }, [days.length]);

  if (days.length === 0) {
    return (
      <div className="results-empty-state">
        <AiVisual
          src={ART.emptyResults}
          alt=""
          width={140}
          height={140}
          className="empty-state-art mx-auto mb-3"
        />
        <p className="results-empty">No hay resultados en esta semana.</p>
      </div>
    );
  }

  const canGoNewer = active > 0;
  const canGoOlder = active < days.length - 1;

  return (
    <div className="results-pager">
      <div className="results-pager-nav">
        <button
          type="button"
          className="results-pager-arrow"
          disabled={!canGoNewer}
          onClick={() => scrollToIndex(active - 1)}
          aria-label="Día más reciente"
        >
          <span className="pager-arrow-mark pager-arrow-mark--left" aria-hidden />
        </button>

        <div className="results-pager-label">
          <p className="results-pager-title">{days[active]?.title}</p>
          <p className="results-pager-counter">
            {active + 1} / {days.length}
          </p>
        </div>

        <button
          type="button"
          className="results-pager-arrow"
          disabled={!canGoOlder}
          onClick={() => scrollToIndex(active + 1)}
          aria-label="Día anterior"
        >
          <span className="pager-arrow-mark pager-arrow-mark--right" aria-hidden />
        </button>
      </div>

      <div className="results-pager-dots">
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className={`results-pager-dot${i === active ? " active" : ""}`}
            onClick={() => scrollToIndex(i)}
            aria-label={d.title}
          />
        ))}
      </div>

      {canGoOlder && active === 0 && (
        <p className="results-pager-hint">Desliza → para ver el día anterior</p>
      )}

      <div ref={trackRef} className="results-pager-track">
        {days.map((day) => (
          <div key={day.date} className="results-pager-slide">
            <div className="results-pager-slide-inner">
              {day.draws.length === 0 ? (
                <p className="results-day-empty">Sin sorteos este día.</p>
              ) : (
                <ResultsDaySection
                  title=""
                  draws={day.draws}
                  showPending={day.showPending}
                  hideHeading
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
