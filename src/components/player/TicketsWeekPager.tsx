"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { TicketActionSheet } from "@/components/player/TicketActionSheet";
import type { ReceiptData } from "@/lib/ticket-receipt";
import type { CartLine } from "@/lib/tickets";

export type TicketFeedItem = {
  id: string;
  ticketNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  data: ReceiptData;
  cartLines: CartLine[];
};

export type TicketDayData = {
  date: string;
  dateKey: string;
  title: string;
  tickets: TicketFeedItem[];
};

export function TicketsWeekPager({ days }: { days: TicketDayData[] }) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [sheetTicket, setSheetTicket] = useState<TicketFeedItem | null>(null);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track || days.length === 0) return;
      const i = Math.max(0, Math.min(index, days.length - 1));
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
      setActive(i);
    },
    [days.length]
  );

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

  const canGoNewer = active > 0;
  const canGoOlder = active < days.length - 1;
  const activeDay = days[active];
  const activeCount = activeDay?.tickets.length ?? 0;

  return (
    <>
      <div className="tickets-pager">
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
            <p className="results-pager-title">{activeDay?.title}</p>
            <p className="results-pager-counter">
              {active + 1} / {days.length}
              {activeCount > 0 &&
                ` · ${activeCount} ticket${activeCount !== 1 ? "s" : ""}`}
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
              className={`results-pager-dot${i === active ? " active" : ""}${
                d.tickets.length > 0 ? " results-pager-dot--has-data" : ""
              }`}
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
              <div className="tickets-pager-slide-inner">
                {day.tickets.length === 0 ? (
                  <p className="tickets-day-empty">Sin tickets este día.</p>
                ) : (
                  day.tickets.map((t) => (
                    <div key={t.id} className="tickets-feed-item">
                      <button
                        type="button"
                        className="tickets-feed-tap"
                        onClick={() => setSheetTicket(t)}
                        aria-label={`Opciones ticket ${t.ticketNumber}`}
                      >
                        <TicketReceipt data={t.data} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {sheetTicket && (
        <TicketActionSheet
          open
          ticketId={sheetTicket.id}
          ticketNumber={sheetTicket.ticketNumber}
          totalAmount={sheetTicket.totalAmount}
          status={sheetTicket.status}
          createdAt={sheetTicket.createdAt}
          cartLines={sheetTicket.cartLines}
          onClose={() => setSheetTicket(null)}
          onCanceled={() => router.refresh()}
        />
      )}
    </>
  );
}
