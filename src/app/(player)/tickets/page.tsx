import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import {
  buildTicketWeekDays,
  getPlayerTickets,
  TICKET_RETENTION_DAYS,
  ticketRetentionStart,
} from "@/lib/ticket-retention";
import { dayStartInTz, nowInTz } from "@/lib/timezone";
import { buildReceiptData } from "@/lib/build-receipt-data";
import { ticketItemsToCartLines } from "@/lib/ticket-cart";
import { BrandHeader } from "@/components/player/BrandHeader";
import { TicketsWeekPager } from "@/components/player/TicketsWeekPager";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export default async function TicketsPage() {
  const user = await requirePlayer();
  if (!user) redirect("/login");

  const tickets = await getPlayerTickets(user.id);
  const today = dayStartInTz(nowInTz());
  const weekStart = ticketRetentionStart();
  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
  const weekRange = `${formatShortDate(weekStart)} – ${formatShortDate(today)}`;

  const feed = tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    totalAmount: t.totalAmount,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    data: buildReceiptData(t, user),
    cartLines: ticketItemsToCartLines(t.items),
  }));

  const days = buildTicketWeekDays(feed);

  return (
    <div className="tickets-page">
      <BrandHeader
        balance={user.wallet?.balance ?? 0}
        title={`Tickets (${tickets.length})`}
      />

      <p className="tickets-date">
        Últimos {TICKET_RETENTION_DAYS} días · {weekRange}
      </p>

      {tickets.length === 0 ? (
        <div className="tickets-empty">
          <AiVisual
            src={ART.emptyTickets}
            alt=""
            width={160}
            height={160}
            className="empty-state-art mx-auto mb-3"
          />
          <p className="text-slate-500 text-sm">Aún no tienes tickets.</p>
          <p className="text-slate-400 text-xs mt-1">
            Se conservan {TICKET_RETENTION_DAYS} días por jugador.
          </p>
          <Link href="/jugar" className="text-[#0d9488] font-semibold text-sm mt-3">
            Ir a jugar →
          </Link>
        </div>
      ) : (
        <TicketsWeekPager days={days} />
      )}
    </div>
  );
}
